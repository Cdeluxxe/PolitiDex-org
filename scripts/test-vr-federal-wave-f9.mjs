#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-federal-wave-f9.mjs — the wave that reread F7's own count and refused
// three quarters of the pool in writing
// ─────────────────────────────────────────────────────────────────────────────
// F9's brief is one sentence of instruction and one sentence of trap. The instruction:
// read the contested House amendment rolls F7 bridged and left unread, map only where
// the amendment's own operative text is an existing key's subject. The trap: F7 handed
// on a number — 54 — and the brief says rebuild it rather than inherit it.
//
// So this harness pins four things a normal ingest harness does not have to.
//
//   · THE COUNT IS NOT 54, AND THE DIFFERENCE IS EVIDENCE, NOT ROUNDING. Section 2
//     requires the funnel to close arithmetically at 51 from the clerk's own paginated
//     indexes, and requires the record to name the two specific defects in F7's own
//     numbers that account for the gap — F7's "unbridged" pair is labelled by YEA TOTAL
//     rather than by roll number, and F7 counted 7 rule-11 failures where 11 exist. A
//     wave that quietly shipped 54 rows, or quietly shipped 51 without saying why, would
//     both pass a looser harness. Neither passes this one.
//   · THE TEXT GATE IS ASYMMETRIC AND THE ASYMMETRY IS THE FINDING. An amendment that
//     was AGREED TO is in the parent's engrossed text and can be read section by
//     section. An amendment that FAILED left its operative words in no published
//     document this corpus can reach. 38 of the 51 failed, so 38 are refused. Section 3
//     requires all eight text sources the brief names to have been probed and recorded,
//     requires every admitted roll to be an AGREED one, and requires the refusal reason
//     for all 38 to be the structural one rather than "not found".
//   · THE PARENT IS A VEHICLE IN BOTH DIRECTIONS. Section 4 checks that no roll call and
//     no issue row this wave writes lands on H.R. 3838 or H.R. 7567, AND that every
//     amendment still hangs off its vehicle through parent_id, which is what the column
//     is for. Section 5 checks the other half of the same wall: the mapping argues from
//     the amendment's section, not from the bill carrying it — five NDAA amendments land
//     on civil rights, climate and crime keys, and strong_defense is declined in writing
//     three separate times.
//   · SEVEN JUDGED ACTS OWE SEVEN MECHANISM PAIRS, AND THE PAIRS SHIP FROM A PRECACHED
//     FILE. Section 7 requires the _DOS_MECH append, requires CACHE_VERSION to have
//     moved, and requires the sw.js note for THIS version to explain what a warm device
//     would otherwise show. Section 10 requires consistency.js to have changed ONLY
//     inside the _DOS_MECH literal — an append-only wall that is checked by diffing the
//     file's two halves against HEAD separately, not by trusting the diff line count.
//
// The rest is the standing contract as F2-F8 check it: refusals recorded first, ceilings
// disclosed rather than implied, data-only SQL declaring no object, verification scoped
// to this wave's roll ids, no party word in anything a reader sees, and a twin boot in
// which nothing but the mechanism file moves.
//
// WHAT THIS FILE DOES NOT DO. It does not assert the 38 are unmappable forever — they are
// unmappable until a source for failed-amendment text exists, which is a different claim
// and the one the record makes. It does not assert the three read-but-unmapped amendments
// earn nothing forever. It does not reopen H.Amdt. 99's NULL parent_id, which this wave
// reports and does not repair. What is pinned is what THIS wave did, and that its own
// record of it is true.
//
//   node scripts/test-vr-federal-wave-f9.mjs
//
// No database and no network. Section 1 re-runs the migration generator from the two
// committed seeds and requires byte-identical output, so the SQL in the tree is provably
// the SQL those seeds describe.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { CJ_SEAMS, CJ_SEAMS_BELOW, SH_SEAMS, WA_SEAMS, carveSeams, assertConsistencySeams, assertStanceHelpersSeam,
  assertWordActionSeams, assertParentTableIsTheOnlyMove } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) { passed++; return true; } failures.push(msg); return false; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const MIG_DIR = "netlify/database/migrations";
const MIGRATION = "20261025000000_vr_federal_wave_f9.sql";
const DECIDE = "db/vr-federal-mapping-seed-f9.json";
const VOTES_FILE = "db/vr-federal-wave-f9-vote-seed.json";
const MIG_GEN = "scripts/vr-gen-federal-wave-f9-migration.mjs";

// IS THIS STILL F9'S OWN TREE? Half of what follows compares the working tree against HEAD,
// and a "this wave GAINED x" assertion is only meaningful while this wave is the newest thing
// in the tree. Once F9 is merged, HEAD holds F9's product, so F9 gains nothing against it and
// every one of those assertions inverts — not because anything regressed, but because the
// question stopped making sense. Each of them is therefore paired below: while F9 is unmerged
// it must be seen to GAIN its product, and once it is merged the same product must still be
// PRESENT. The second form is the one that lasts, and it is not weaker — a wave that quietly
// dropped F9's seven curated pairs, its seven issue mappings or its seven openable addresses
// fails the present-tense check just as loudly.
let f9Unmerged = true;
try {
  execFileSync("git", ["cat-file", "-e", `HEAD:${MIG_DIR}/${MIGRATION}`], { cwd: ROOT, stdio: "ignore" });
  f9Unmerged = false;
} catch { /* F9's migration is not in HEAD: this is F9's own pre-merge tree */ }
const VOTE_GEN = "scripts/vr-gen-federal-wave-f9-vote-seed.mjs";
const CENSUS_GEN = "scripts/vr-federal-wave-f9-census.mjs";
const ISSUE_SEED = "db/vr-issue-seed.json";

// The seven roll calls, written down here rather than read out of the seed, so a seed that
// silently gains or loses a roll fails instead of moving the goalposts.
const ROLLS = [[1, 246], [1, 248], [1, 249], [1, 251], [1, 252], [2, 148], [2, 152]];
const NUMBERS = ["H.Amdt. 86", "H.Amdt. 88", "H.Amdt. 89", "H.Amdt. 79", "H.Amdt. 81",
                 "H.Amdt. 196", "H.Amdt. 207"];
const PARENTS = ["H.R. 3838", "H.R. 7567"];
const KEYS = ["climate_action", "lgbtq_rights", "states_federal_power", "tough_on_crime"];
// states_federal_power is in stance-helpers.js's _RD_NO_POLE, so its row is inventory and
// prints no direction. It is the one key in this wave whose mechanism pair has to say so.
const NO_POLE_KEY = "states_federal_power";

// THIS WAVE'S version note, not the whole history above the constant. The comment block
// over CACHE_VERSION is hundreds of contiguous lines of every past bump's note, so reading
// all of it would let an old paragraph satisfy this wave's checks. The log is one entry per
// version in the house form "// vNN - TITLE", newest first, so this wave's note is the span
// from its own marker to the previous version's.
const MY_VERSION = 100;
function swWaveNote() {
  const sw = R("sw.js");
  const at = sw.indexOf(`// v${MY_VERSION} `);
  if (at === -1) return "";
  const end = sw.indexOf(`// v${MY_VERSION - 1} `, at);
  return sw.slice(at, end === -1 ? at + 8000 : end).replace(/\s+$/, "");
}

console.log("\n  F9 — 51 contested rolls rebuilt, 7 admitted on read text, 44 refused in writing\n");

for (const f of [DECIDE, VOTES_FILE, join(MIG_DIR, MIGRATION), MIG_GEN, VOTE_GEN, CENSUS_GEN,
                 "consistency.js", "sw.js", "issue-scope.js", "stance-helpers.js",
                 "alignment-tool.js", ISSUE_SEED])
  ok(existsSync(join(ROOT, f)), `${f} is missing — the wave's own artifact`);

const decide = J(DECIDE);
const votes = J(VOTES_FILE);
const sql = R(join(MIG_DIR, MIGRATION));
const mech = R("consistency.js");
const scopeSrc = R("issue-scope.js");
const helpers = R("stance-helpers.js");
const issueMapSrc = R("alignment-tool.js");
const issueSeed = J(ISSUE_SEED);
const swNote = swWaveNote();

// ── 1. the artifacts agree with each other, and the SQL is provably theirs ──
{
  eq(decide.wave, "F9", "the mapping seed does not name this wave");
  eq(votes.wave, "F9", "the vote seed does not name this wave");
  eq(votes.chamber, "house", "the vote seed is not scoped to the House");

  eq(decide.measures.length, 7, "the decision record does not carry seven measures");
  eq(votes.votes.length, 7, "the vote seed does not carry seven rolls");
  eq(decide.measures.map((m) => m.number).sort().join("|"), [...NUMBERS].sort().join("|"),
    "the decision record's measures are not this wave's seven amendments");
  eq(votes.votes.map((v) => `${v.session}/${v.rollNumber}`).sort().join(","),
    ROLLS.map(([s, r]) => `${s}/${r}`).sort().join(","),
    "the vote seed's rolls are not this wave's seven");

  const cells = votes.votes.reduce((a, v) => a + v.memberVotes.length, 0);
  eq(cells, votes.memberVoteCount, "the vote seed's own cell count disagrees with its rows");
  eq(cells, decide._counts.memberVoteCells, "the two seeds disagree on how many cells ship");
  eq(decide._counts.issueRows, decide.measures.reduce((a, m) => a + m.issues.length, 0),
    "the decision record's issue-row count disagrees with its own rows");
  eq(decide._counts.declinedIssueRows, decide.measures.reduce((a, m) => a + m.declinedIssues.length, 0),
    "the decision record's decline count disagrees with its own rows");
  eq(decide._counts.newKeys, 0, "this wave claims a new issue key");
  eq(decide._counts.parentRollsWritten, 0, "this wave claims to write a parent roll");
  eq(decide._counts.parentMeasuresTouched, 0, "this wave claims to touch a parent measure");

  // Every roll in the vote seed carries the same measure identity the decision record
  // gives it. A wave whose two seeds disagree about which amendment a roll belongs to
  // is a wave that could publish the right tally against the wrong text.
  for (const v of votes.votes) {
    const m = decide.measures.find((x) => x.number === v.measure.number);
    if (!ok(m, `${v.measure.number} is in the vote seed and not in the decision record`)) continue;
    eq(m.roll, `119/${v.session}/${v.rollNumber}`, `${m.number}: the two seeds disagree on the roll`);
    eq(m.parentNumber, v.measure.parentNumber, `${m.number}: the two seeds disagree on the parent`);
    eq(m.tally, `${v.totals.yea}-${v.totals.nay}`, `${m.number}: the record's tally is not the seed's`);
  }

  // THE SQL IS REGENERATED AND COMPARED BYTE FOR BYTE. A migration edited by hand after
  // generation is a migration whose stated provenance is false, and every claim this
  // harness makes about the SQL is really a claim about the seeds it came from.
  const target = join(ROOT, MIG_DIR, MIGRATION);
  const before = readFileSync(target);
  try {
    execFileSync(process.execPath, [join(ROOT, MIG_GEN)], { cwd: ROOT, encoding: "utf8" });
    const after = readFileSync(target);
    ok(before.equals(after),
      "the migration in the tree is not what its generator produces from the committed seeds");
  } catch (e) {
    ok(false, `the migration generator did not run: ${e.message}`);
  } finally {
    writeFileSync(target, before);
  }
}

// ── 2. the count was rebuilt, not inherited, and the gap is evidence ────────
{
  const c = decide.census;
  const f7 = decide.f7CountCorrection;
  eq(f7.f7Claimed.contestedAndUnread, 54, "the record does not carry F7's claimed 54");
  eq(f7.f9Rebuilt.contestedAndUnread, 51, "the rebuild does not come back at 51");
  eq(c.poolHandedOn.contestedAndUnread, 51, "the pool handed on is not the rebuilt 51");
  eq(c.poolHandedOn.admitted + c.poolHandedOn.refused, 51,
    "the census does not balance — admitted plus refused is not the contested pool");
  eq(c.poolHandedOn.admitted, decide.measures.length,
    "the census's admitted count is not the number of measures that ship");
  eq(c.refusedInWriting.length, c.poolHandedOn.refused,
    "the census claims a refusal count it does not list");

  // The funnel is a chain: each step's `from` must be the previous step's `to`, and the
  // last `to` before the admit decision must be reachable. An arithmetic funnel is the
  // only kind that can be checked by somebody who was not there.
  for (let i = 1; i < c.funnel.length; i++)
    eq(c.funnel[i].from, c.funnel[i - 1].to, `funnel step ${c.funnel[i].step} does not follow the step above it`);
  eq(c.funnel[0].from, c.listed.indexRowsTotal, "the funnel does not start at the clerk index row count");
  eq(c.funnel[0].to, c.listed.amendmentRolls, "the funnel's first step does not land on the amendment rolls");
  eq(c.listed.y2025 + c.listed.y2026, c.listed.amendmentRolls,
    "the two clerk years do not add up to the amendment-roll pool");

  // A funnel that returns almost nothing looks exactly like a funnel with a broken
  // filter, and F6 shipped that bug: it read a display tally, so "51-42" parsed as 5142
  // and every roll came back unanimous. Two defences are required to be recorded here,
  // because both are things this census actually had to do differently.
  ok(/totals-by-vote/.test(JSON.stringify(c)) || /totals-by-vote/.test(sql),
    "nothing says the tally came from the clerk's structured totals rather than a display string");
  ok(/paginated|ROLL_\d|ROLL_%|ROLL_/.test(JSON.stringify(c.sources)) || /PAGINATED|paginated/.test(sql),
    "nothing says the clerk index was walked page by page — index.asp returns only the most recent rolls");

  // THE TWO DEFECTS, NAMED. This is the part a looser harness would let slide: shipping
  // 51 without accounting for the 54 is inheriting a stale count by omission.
  eq(f7.defects.length, 2, "the record does not name two defects in F7's numbers");
  const defectText = f7.defects.join(" ");
  ok(/yea total/i.test(defectText),
    "the record does not say that F7's unbridged pair is labelled by yea total rather than roll number");
  for (const n of ["395", "427", "H.Amdt. 152", "H.Amdt. 154"])
    ok(defectText.includes(n), `the mislabelled-pair defect does not cite ${n}`);
  for (const n of ["H.Amdt. 186", "H.Amdt. 191"])
    ok(defectText.includes(n), `the missed rule-11 defect does not cite ${n}`);
  ok(/\b54\b/.test(f7.net) && /\b51\b/.test(f7.net), "the reconciliation does not state both counts");
  eq(f7.f9Rebuilt.failingRule11 - f7.f7Claimed.failingRule11, 4,
    "the rule-11 counts do not differ the way the defect claims they do");

  // Rule 11 is checked on the amend roll itself, from the seed's own totals, for every
  // admitted roll — not taken on the record's word.
  for (const v of votes.votes) {
    const pool = v.totals.yea + v.totals.nay;
    const losing = Math.min(v.totals.yea, v.totals.nay);
    ok(pool > 0 && losing * 10 >= pool,
      `${v.measure.number}: fails rule 11 — the losing side is under a tenth of the yea+nay pool`);
  }
}

// ── 3. the text gate: eight sources probed, and the asymmetry is the finding ──
{
  const g = decide.census.textGate;
  eq(g.probed.length, 8, "the record does not list eight probed text sources");
  const probedText = g.probed.map((p) => `${p.source} ${p.result}`).join(" | ");
  for (const s of ["clerk", "congress.gov", "BILLSTATUS", "Rules Committee", "CREC", "eh"])
    ok(new RegExp(s, "i").test(probedText), `the text-source probe does not record ${s}`);
  ok(g.probed.filter((p) => /WORKS/i.test(p.result)).length === 1,
    "more or fewer than one probed source is recorded as working — the gate's shape is the finding");
  ok(/encrypted|security handler/i.test(probedText) && /left in place|not circumvented/i.test(probedText),
    "the Rules Committee PDF result does not record that the protection was left in place");

  // EVERY ADMITTED ROLL IS AN AGREED ONE. This is not a coincidence to be noticed later:
  // it is the mechanism of the gate, and if a failed amendment ever appears among the
  // admitted, the wave has guessed from a title.
  for (const m of decide.measures) {
    eq(m.result, "agreed", `${m.number} was admitted without being agreed to — its text is unpublished`);
    ok(/BILLS-119hr\d+(eh|rh)/.test(m.textVerifiedAt),
      `${m.number}: the text citation does not name an engrossed or as-reported document`);
    ok(/SEC\./.test(m.textVerifiedAt), `${m.number}: the text citation names no section`);
    ok(String(m.textVerificationMethod).length > 40,
      `${m.number}: the verification method is not written down`);
  }

  // The 38, refused for the structural reason and not for want of trying.
  const t = decide.refusedThisWave.textNotVerifiable;
  eq(t.count, 38, "the refused-for-text count is not 38");
  eq(t.rolls.length, t.count, "the refused-for-text block lists a different number than it claims");
  ok(/FAILED/.test(t.whyEveryOneOfThemFails),
    "the refusal reason does not say that all 38 failed on the floor");
  for (const r of t.rolls) {
    ok(String(r.reason).length > 40, `${r.hamdt}: refused with no written reason`);
    ok(!/not found|unavailable$/i.test(String(r.reason).trim()),
      `${r.hamdt}: refused with "not found" rather than with the structural reason`);
  }
  eq(decide.census.poolHandedOn.stillUnreadableUntilAFailedAmendmentTextSourceExists, 38,
    "the record does not hand the 38 on as reopenable when a text source exists");

  // The three whose text WAS read and which still earn nothing. A wave that mapped these
  // would be inventing a key or widening a scope note to fit.
  const n = decide.refusedThisWave.textReadNoKeyEarned;
  eq(n.count, 3, "the read-but-unmapped count is not 3");
  eq(n.rolls.length, 3, "the read-but-unmapped block lists a different number than it claims");
  for (const r of n.rolls)
    ok(String(r.reason).length > 80, `${r.hamdt}: read and refused with no argued reason`);

  // 3 + 38 + 3 = 44. The three gates and the refusal total have to close.
  eq(decide.refusedThisWave.refusalFirst.length + t.count + n.count, 44,
    "the three refusal gates do not add up to the 44 the census hands on");
}

// ── 4. the parent is not double-counted, in either direction ────────────────
{
  // No roll call is filed against a parent. Checked in the SQL text, because that is what
  // actually runs: every vr_rollcalls insert names a measure variable, and none of the two
  // parent variables may appear in one.
  const rollInserts = [...sql.matchAll(/INSERT INTO vr_rollcalls[\s\S]*?VALUES \(([^,]+),/g)].map((m) => m[1].trim());
  eq(rollInserts.length, 7, "the migration does not insert exactly seven roll calls");
  for (const target of rollInserts)
    ok(!/^p_hr/.test(target), `a roll call is filed against a parent vehicle (${target})`);
  for (const target of rollInserts)
    ok(/^m_h_amdt_/.test(target), `a roll call is filed against something other than an amendment (${target})`);

  // No issue row lands on a parent either.
  const issueInserts = [...sql.matchAll(/INSERT INTO vr_measure_issues[\s\S]*?VALUES \(([^,]+),/g)].map((m) => m[1].trim());
  eq(issueInserts.length, 7, "the migration does not insert exactly seven issue rows");
  for (const target of issueInserts)
    ok(/^m_h_amdt_/.test(target), `an issue row is filed against ${target} rather than against an amendment`);

  // And the parents are READ, never written. Their names may appear in a SELECT and in a
  // comment; they may not appear in an INSERT, an UPDATE or a DELETE.
  for (const stmt of sql.match(/\b(INSERT INTO|UPDATE|DELETE FROM)\b[\s\S]*?;/g) || []) {
    const head = stmt.slice(0, 400);
    for (const p of PARENTS)
      ok(!head.includes(`'${p}'`) || /SELECT/i.test(head) === true && false || !/^(INSERT INTO vr_measures|UPDATE vr_measures)/.test(stmt),
        `a write statement names the parent ${p}`);
  }
  ok(!/UPDATE\s+vr_measures/i.test(sql), "the migration updates vr_measures — no existing measure is this wave's to rewrite");
  ok(!/DELETE\s+FROM/i.test(sql), "the migration deletes rows");
  eq((sql.match(/INSERT INTO vr_positions/g) || []).length, 0,
    "the migration writes a stated position — this wave is formal pattern only");

  // The parents are named as vehicles in the record, with a reason each, and the record
  // says what they do NOT gain.
  eq(Object.keys(votes.parentsAreVehicles).sort().join(","), [...PARENTS].sort().join(","),
    "the vote seed does not name both parents as vehicles");
  for (const p of PARENTS) {
    ok(String(votes.parentsAreVehicles[p]).length > 60, `${p}: no written reason it is a vehicle`);
    ok(/no roll|adds no|gain(s)? nothing|untouched/i.test(String(votes.parentsAreVehicles[p])),
      `${p}: the record does not say what the vehicle does not gain`);
  }

  // THE OTHER HALF OF THE SAME WALL. parent_id is what nests an amendment under its bill,
  // so refusing to double-count is not the same as refusing to relate them. Every
  // amendment insert passes a parent variable, and the verification block checks it.
  const measureInserts = [...sql.matchAll(/INSERT INTO vr_measures[\s\S]*?VALUES \(([\s\S]*?)\)\s*\n\s*RETURNING/g)];
  eq(measureInserts.length, 7, "the migration does not insert exactly seven measures");
  for (const m of measureInserts)
    ok(/\bp_hr(3838|7567)\b/.test(m[1]), "an amendment is inserted with no parent_id — it would not nest under its vehicle");
  ok(/NOT \(m\.parent_id = ANY\(parent_ids\)\)/.test(sql),
    "the verification block does not check that each amendment hangs off one of the two vehicles");
  ok(/r\.measure_id = ANY\(parent_ids\)/.test(sql),
    "the verification block does not check that no roll was filed against a parent");
}

// ── 5. the amend maps to its subject, not to its vehicle ────────────────────
{
  eq(decide._counts.keysUsed.sort().join(","), [...KEYS].sort().join(","),
    "the keys this wave writes are not the four it argues for");
  for (const m of decide.measures) {
    eq(m.issues.length, 1, `${m.number} carries more or fewer than one issue row`);
    const i = m.issues[0];
    ok(KEYS.includes(i.issueKey), `${m.number}: ${i.issueKey} is outside this wave's four keys`);
    eq(i.weight, 100, `${m.number}: the weight is not 100`);
    eq(i.isPrimary, true, `${m.number}: the row is not primary`);
    // THE DIRECTION IS A FIELD, NOT A TONE OF VOICE. stance-helpers.js's
    // _voteEffectiveSupport reads support_meaning as the resolver and flips a yea when it
    // is 'yea_opposes', so a row whose prose argues AGAINST a key and whose field says
    // 'yea_supports' publishes the member's vote backwards on their own profile. The
    // argued direction is stored beside the field precisely so this can be checked.
    ok(["against", "advances", "inventory"].includes(i.direction),
      `${m.number}: the row records no argued direction`);
    eq(i.supportMeaning, i.direction === "against" ? "yea_opposes" : "yea_supports",
      `${m.number}: support_meaning does not encode the direction the row was argued to (${i.direction})`);
    // And the prose agrees with the field, so a later edit to one is caught by the other.
    if (i.direction === "against")
      ok(/against the (key|chip)|AGAINST|subtract|narrow|repeal/i.test(i.rationale),
        `${m.number}: the row is filed yea_opposes and the rationale does not argue against the key`);
    if (i.direction === "advances")
      ok(/advanced direction|advances|increase/i.test(i.rationale),
        `${m.number}: the row is filed yea_supports and the rationale does not argue for the key`);
    ok(i.rationale.length >= 200, `${m.number}: the rationale is a label rather than an argument`);
    // THE RATIONALE ARGUES FROM THE SECTION, NOT FROM THE BILL. It must cite the section
    // of operative text it was read at, and it must not lean on the parent's identity.
    const sec = (m.textVerifiedAt.match(/SEC\.\s*[0-9A-Z]+/) || [])[0];
    ok(sec && i.rationale.includes(sec),
      `${m.number}: the rationale does not cite the section its text was read at (${sec})`);
    ok(!/because the parent|because the vehicle|because it amends the (defense|farm)/i.test(i.rationale),
      `${m.number}: the rationale argues from the vehicle`);
  }

  // FIVE OF THE SEVEN AMEND THE ANNUAL DEFENSE AUTHORIZATION AND NONE OF THEM IS FILED ON
  // DEFENSE. That is the restuffing wall in one assertion.
  const ndaa = decide.measures.filter((m) => m.parentNumber === "H.R. 3838");
  eq(ndaa.length, 5, "the record does not carry five amendments to the defense authorization");
  for (const m of ndaa)
    ok(m.issues[0].issueKey !== "strong_defense",
      `${m.number} is filed on strong_defense because its vehicle is the NDAA — that is restuffing`);
  const defenseDeclines = decide.measures.filter((m) => m.declinedIssues.some((d) => d.issueKey === "strong_defense"));
  ok(defenseDeclines.length >= 3,
    "strong_defense is declined fewer than three times — the wave did not argue the restuffing question out");
  for (const m of defenseDeclines)
    ok(/venue|benefit|installation/i.test(m.declinedIssues.find((d) => d.issueKey === "strong_defense").why),
      `${m.number}: the strong_defense decline gives no reason of its own`);

  // Every decline names a key that exists and gives a reason. A decline with no reason is
  // a key that was never considered.
  eq(decide._counts.declinedIssueRows, 10, "the decline count is not the ten this wave recorded");
  for (const m of decide.measures) for (const d of m.declinedIssues) {
    // A key with a written scope note lives in issue-scope.js; a key that exists but has
    // no argued-out boundary lives only in alignment-tool.js's ISSUE_MAP. Both are real
    // keys and both are declinable — and the DIFFERENCE between them is itself the reason
    // two of this wave's refusals exist, so the check accepts either home.
    ok(scopeSrc.includes(d.issueKey) || issueMapSrc.includes(`${d.issueKey}:`),
      `${m.number}: declined ${d.issueKey}, which is not a key anywhere in the ledger`);
    ok(d.why.length >= 80, `${m.number}: the ${d.issueKey} decline is asserted rather than argued`);
  }

  // The one no-pole key really is one, and the record says the row prints no stance.
  const noPole = decide.measures.filter((m) => m.issues[0].issueKey === NO_POLE_KEY);
  eq(noPole.length, 1, `the record does not carry exactly one ${NO_POLE_KEY} row`);
  ok(new RegExp(`${NO_POLE_KEY}\\s*:\\s*1`).test(helpers),
    `${NO_POLE_KEY} is not in stance-helpers.js's _RD_NO_POLE — the inventory claim is false`);
  ok(/inventory|no pole|prints no stance|no direction/i.test(noPole[0].issues[0].rationale),
    `${noPole[0].number}: the rationale does not say the row is inventory and prints no direction`);
}

// ── 5b. the curated issue seed mirrors the migration, and only grew ─────────
{
  // db/vr-issue-seed.json is what applyCuratedIssueSeed() in netlify/lib/vr-ingest.ts
  // reads, and scripts/test-vr-vote-seed.mjs refuses any ingest seed whose measures are
  // not mapped there. So the seven rows exist twice on purpose — and if the two copies
  // ever disagree, a live ingest and this migration would file the same amendment two
  // different ways. They are compared field by field here rather than trusted.
  const seedByNumber = new Map(issueSeed.measures.filter((m) => m.number).map((m) => [`${m.congress}|${m.number}`, m]));
  for (const m of decide.measures) {
    const s9 = seedByNumber.get(`119|${m.number}`);
    if (!ok(s9, `${m.number} is not in ${ISSUE_SEED} — its roll would rank nothing`)) continue;
    eq(s9.measureType, "amendment", `${m.number}: the curated seed does not file it as an amendment`);
    eq(s9.chamber, "house", `${m.number}: the curated seed does not file it in the House`);
    eq(s9.shortTitle, m.shortTitle, `${m.number}: the curated seed's short title is not the record's`);
    eq(s9.issues.length, m.issues.length, `${m.number}: the two copies carry a different number of issue rows`);
    for (let k = 0; k < m.issues.length; k++) {
      for (const f of ["issueKey", "weight", "isPrimary", "supportMeaning", "rationale"])
        eq(s9.issues[k][f], m.issues[k][f], `${m.number}: the curated seed's ${f} is not the record's`);
    }
    ok(/Federal wave F9/.test(String(s9._comment)), `${m.number}: the curated seed entry does not name this wave`);
    ok(String(s9._comment).includes(MIGRATION), `${m.number}: the curated seed entry does not cite the migration it mirrors`);
  }

  // AND THE SEED ONLY GREW. This file is 3,500 lines of other waves' curated prose; a
  // reserialize would rewrite every line of it, which is how a "no-op" formatting change
  // silently reorders somebody else's mapping.
  let headSeed = null;
  try { headSeed = execFileSync("git", ["show", `HEAD:${ISSUE_SEED}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch { /* no git */ }
  if (headSeed) {
    const old = JSON.parse(headSeed);
    if (f9Unmerged) {
      eq(issueSeed.measures.length, old.measures.length + 7, "the curated issue seed did not grow by exactly seven measures");
    } else {
      ok(issueSeed.measures.length >= old.measures.length,
        `the curated issue seed SHRANK (${old.measures.length} → ${issueSeed.measures.length})`);
      const have = new Set(issueSeed.measures.map((m) => String(m.number || "")));
      for (const n2 of NUMBERS) ok(have.has(n2), `${n2} lost its curated issue mapping`);
    }
    eq(JSON.stringify(issueSeed.measures.slice(0, old.measures.length)), JSON.stringify(old.measures),
      "the curated issue seed's existing measures were rewritten rather than appended to");
    eq(JSON.stringify(issueSeed._phase12_overlap_priority), JSON.stringify(old._phase12_overlap_priority),
      "the curated issue seed changed outside its measures array");
    // Byte-level: the appended text is a splice, so everything above the insertion point
    // is unchanged. Checked on the raw bytes, because a reindent parses identically.
    const raw = R(ISSUE_SEED);
    const at = headSeed.indexOf("\n  ],\n");
    ok(at > 0 && raw.startsWith(headSeed.slice(0, at)),
      "the curated issue seed was reformatted above the append point");
    ok(raw.endsWith(headSeed.slice(at)), "the curated issue seed was reformatted below the append point");
  }
}

// ── 6. the six vocabulary rules, walked rather than cited ───────────────────
{
  const v = decide.vocabDecision;
  eq(v.newKeys, 0, "the vocabulary decision claims a new key");
  eq(v.sixRules.length, 6, "the six standing vocabulary rules are not all walked");
  const seen = new Set();
  for (const r of v.sixRules) {
    ok(Number.isInteger(r.rule) && r.rule >= 1 && r.rule <= 6, `a vocabulary rule carries no number (${r.name})`);
    ok(!seen.has(r.rule), `vocabulary rule ${r.rule} is walked twice`);
    seen.add(r.rule);
    ok(String(r.name).length > 3, `vocabulary rule ${r.rule} has no name`);
    ok(String(r.note).length >= 40, `vocabulary rule ${r.rule} is cited rather than walked (note too short)`);
    ok(String(r.verdict).length > 0, `vocabulary rule ${r.rule} reaches no verdict`);
  }
  eq(seen.size, 6, "the six rules are not six distinct rules");
  ok(/venue|place is not a subject|not a subject/i.test(v.noVenueKey),
    "the record does not refuse a venue key in its own words");
  ok(/D\.C\.|District|Washington/i.test(v.noVenueKey) || /installation/i.test(v.noVenueKey),
    "the venue refusal does not name the venue it is refusing");
  ok(/widen|restuff|scope note/i.test(v.noRestuffing),
    "the record does not say that no existing key's scope was widened");
}

// ── 7. the walls ────────────────────────────────────────────────────────────
{
  // pack-generation comment on EVERY new vr_measure_issues row.
  const packComments = (sql.match(/--\s*pack-generation/g) || []).length;
  ok(packComments >= 7, `only ${packComments} pack-generation comments for 7 new issue rows`);
  // The comment sits directly above the INSERT, with the row's own wrapped rationale
  // between them — so the window has to be wide enough to clear a rationale comment,
  // which runs to a few hundred words, and narrow enough that it cannot reach the
  // previous issue row's comment. The measure and roll-call inserts in between make
  // that separation real.
  const issueBlocks = sql.split(/INSERT INTO vr_measure_issues/);
  eq(issueBlocks.length - 1, 7, "the migration does not carry seven issue-row inserts");
  for (let i = 1; i < issueBlocks.length; i++) {
    const preamble = issueBlocks[i - 1].slice(-4000);
    const at = preamble.lastIndexOf("-- pack-generation");
    ok(at !== -1, `issue row ${i} has no pack-generation comment above it`);
    ok(at === -1 || !/INSERT INTO/.test(preamble.slice(at)),
      `issue row ${i}'s nearest pack-generation comment belongs to another insert`);
  }

  // NO CREATE OF ANY KIND. scripts/test-vr-corrections.mjs reads any CREATE of a TABLE as a
  // declaration however temporary, and a data-only migration sorting after the newest
  // drizzle snapshot may not declare one.
  ok(!/CREATE\s+(TEMP|TEMPORARY|UNLOGGED)?\s*TABLE/i.test(sql), "the migration declares a table");
  ok(!/CREATE\s+(UNIQUE\s+)?INDEX/i.test(sql), "the migration declares an index");
  ok(!/ALTER\s+TABLE/i.test(sql), "the migration alters a table");
  ok(/roll_ids\s+integer\[\]/.test(sql), "the verification block does not scope itself through an integer[] local");

  // The direction is stated beside the field in the SQL too, so a reader of the migration
  // alone can see that the two were checked against each other.
  eq((sql.match(/--\s*direction (against|advances|inventory) → support_meaning yea_(opposes|supports)\./g) || []).length, 7,
    "the migration does not state each row's argued direction beside its support_meaning");

  // VERIFICATION SCOPED TO THIS WAVE'S ROLL IDS. Every count in the verification block has
  // to be qualified by roll_ids, measure_ids or parent_ids; a corpus-wide count is a guard
  // that fails when some other wave lands and then gets deleted.
  const verifyAt = sql.lastIndexOf("DO $$");
  const verify = sql.slice(verifyAt);
  ok(verify.length > 1500, "the verification block is too small to be doing anything");
  const counts = [...verify.matchAll(/SELECT\s+count\(\*\)[\s\S]*?;/g)].map((m) => m[0]);
  ok(counts.length >= 10, `only ${counts.length} counted assertions in the verification block`);
  for (const c of counts)
    ok(/roll_ids|measure_ids|parent_ids/.test(c),
      `a verification count is not scoped to this wave: ${c.replace(/\s+/g, " ").slice(0, 90)}`);
  for (const [s, r] of ROLLS)
    ok(new RegExp(`\\(119,\\s*${s},\\s*${r}\\)`).test(verify), `the verification block does not name roll 119/${s}/${r}`);
  ok(/RAISE NOTICE/.test(verify), "the verification block says nothing on success");

  // The full-chamber bound is a HOUSE bound. Copying the Senate wave's 99-100 would pass a
  // migration whose totals were the roster's rather than the chamber's.
  const bound = /NOT BETWEEN (\d+) AND (\d+)/.exec(verify);
  ok(bound && Number(bound[1]) >= 400 && Number(bound[2]) <= 445,
    "the full-chamber guard is not a House bound");

  // Full-chamber totals on the amend roll, in the seed as well as in the SQL.
  for (const v of votes.votes) {
    const t = v.totals;
    const all = t.yea + t.nay + t.present + t.notVoting;
    ok(all >= 425 && all <= 441, `${v.measure.number}: totals account for ${all} members, not a full House`);
    const attributed = v.memberVotes.filter((x) => x.position === "yea" || x.position === "nay").length;
    ok(attributed <= t.yea + t.nay,
      `${v.measure.number}: over-attribution — more attributed yea/nay rows than the document's pool`);
  }

  // actionType stays in the closed vocabulary, and never invents a discharge on a House amend.
  for (const v of votes.votes) eq(v.actionType, "amendment", `${v.measure.number}: actionType is not amendment`);
  // Read off the action_type column's own values rather than off the file, so the comment
  // that FORBIDS a discharge does not fail the check that forbids one.
  const rollValues = [...sql.matchAll(/, ('amendment'|'passage'|'motion'|'procedural'|'nomination'|'concurrence'|'cloture'|'discharge'), '(?:agreed|failed|passed|rejected)'/g)].map((m) => m[1]);
  eq(rollValues.length, 7, "the seven roll-call inserts do not carry a readable action_type");
  for (const t of rollValues) eq(t, "'amendment'", `a roll call carries action_type ${t}`);
  ok(!rollValues.includes("'discharge'"), "the migration invents a discharge on a House amendment");
  ok(!/discharge/i.test(votes.votes.map((v) => v.question).join(" ")),
    "a House amendment roll is recorded as a discharge motion");

  // JUDGED ACTS OWE _DOS_MECH PAIRS, AND THE PAIRS OWE A CACHE BUMP.
  for (const m of decide.measures) {
    const key = `'${m.number}|119|${m.issues[0].issueKey}'`;
    if (!ok(mech.includes(key), `${m.number}: no _DOS_MECH pair for ${m.issues[0].issueKey}`)) continue;
    const at = mech.indexOf(key);
    const entry = mech.slice(at, mech.indexOf("\n    },", at) + 6);
    for (const f of ["did:", "why:", "more:"])
      ok(entry.includes(f), `${m.number}: the mechanism pair has no ${f.replace(":", "")} line`);
    ok(/\d{3}-\d{2,3}/.test(entry), `${m.number}: the mechanism pair does not carry the tally`);
    ok(/BILLS-119hr\d+(eh|rh)/.test(entry), `${m.number}: the mechanism pair does not say where the text was read`);
  }
  const noPoleEntry = (() => {
    const key = `'H.Amdt. 196|119|${NO_POLE_KEY}'`;
    const at = mech.indexOf(key);
    return at === -1 ? "" : mech.slice(at, mech.indexOf("\n    },", at) + 6) || mech.slice(at, at + 3000);
  })();
  ok(/inventory|prints no stance|no stance either way|no direction/i.test(noPoleEntry),
    "the no-pole mechanism pair does not say the row prints no stance");

  // At least F9's number, not exactly it. Every later wave that changes a cached file bumps
  // this counter again, and pinning equality would make F9 fail for a reason that is the
  // system working: federal_roster_r1_sep2026 ships 315 new CMP_DATA identity rows and 315
  // new BROWSE_PHOTOS portraits, so a warm device needs v101. What F9 still requires is that
  // its own bump was never rolled BACK, and its note below still has to be here to explain it.
  {
    const shipped = Number((R("sw.js").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
    ok(Number.isFinite(shipped) && shipped >= MY_VERSION,
      `CACHE_VERSION is v${shipped}, behind the v${MY_VERSION} this wave's mechanism prose shipped with`);
  }
  ok(swNote.length > 800, "this wave's sw.js version note is missing or too short to explain the bump");
  ok(/_DOS_MECH/.test(swNote), "the version note does not say which shipped file changed");
  ok(/warm|stale|old copy|holding v99/i.test(swNote),
    "the version note does not say what a warm device would otherwise show");
  ok(new RegExp(NO_POLE_KEY).test(swNote), "the version note does not name the row that prints no direction");
  ok(/H\.Amdt\./.test(swNote), "the version note does not name the instruments");

  // AMERICAN SPELLING IN NEW MECHANISM COPY. Scanned over the copy THIS wave wrote: the
  // seven mechanism entries, the migration, the decision record and this wave's sw.js note.
  const mechStart = mech.indexOf("Federal wave F9: the contested House amendments");
  const mechNew = mechStart === -1 ? "" : mech.slice(mechStart, mech.indexOf("\n  };", mechStart));
  ok(mechNew.length > 4000, "the spelling scan cannot find this wave's mechanism copy");
  const recordProse = (() => {
    const clone = JSON.parse(JSON.stringify(decide));
    delete clone.walls.americanSpelling;
    return JSON.stringify(clone);
  })();
  const newProse = [sql, recordProse, swNote, mechNew].join("\n");
  ok(newProse.length > 20000, "the spelling scan is reading almost nothing");
  for (const b of [/\bdefence\b/i, /\boffence\b/i, /\bcentre\b/i, /\bfavour\b/i, /\bbehaviour\b/i,
                   /\blabour\b/i, /\borganis(e|ed|ing|ation)\b/i, /\brecognise\b/i, /\bmislabelled\b/i])
    ok(!b.test(newProse), `copy this wave wrote uses a British spelling (${b})`);

  // STRANDED STORED CELLS: REPORTED, NOT DELETED.
  const st = decide.walls.strandedStoredCells;
  ok(st.reported >= 1, "the wave reports no stranded stored cell — F7's NULL parent_id row is one");
  ok(/H\.Amdt\. 99/.test(st.detail), "the stranded-cell report does not name the row");
  ok(/not repaired|REPORTED|report/i.test(st.detail), "the stranded-cell report does not say it was left alone");
  ok(!/UPDATE\s+vr_measures\s+SET\s+parent_id/i.test(sql), "the migration repairs F7's row — that is not this wave's scope");
}

// ── 8. read-loss disclosure ─────────────────────────────────────────────────
{
  const d = decide.readDisclosure;
  ok(/\d/.test(String(d.whatIsStillLost)), "the read-loss disclosure carries no number");
  ok(String(d.whatIsStillLost).includes(String(votes.unresolvedCells?.bioguideNotInMemberMap ?? decide._counts.unresolvedRecordedVotes)),
    "the disclosure's read-loss number is not the seed's");
  ok(/does not close|not closed/i.test(String(d.whatIsStillLost)),
    "the disclosure implies the loss was closed");
  ok(/bmoore/.test(String(d.whatDoesNotMove)) || /bmoore/.test(String(d.whatMoves)),
    "the disclosure does not name the smoke-test member the brief asks about");
  ok(/lee/i.test(String(d.whatDoesNotMove)),
    "the disclosure does not state that /p/lee cannot move on a House-only wave");
  ok(/\b38\b/.test(String(d.theBiggerReadLoss)),
    "the bigger read loss does not carry the 38 unreadable rolls");
  ok(/ceiling/i.test(String(d.houseAttributionCeiling)), "the attribution ceiling is not disclosed as one");
  // And it is in the migration too, not only in the seed a reader never opens.
  ok(sql.includes("WHAT IS STILL LOST"), "the migration does not disclose the read loss");
  ok(sql.includes(String(decide._counts.unresolvedRecordedVotes)),
    "the migration does not carry the unresolved-vote count");
}

// ── 8b. the offline snapshot moved, and it moved on this wave's subjects ────
// db/share-index.json's personRecord is built by booting the real consistency.js over the
// migrations ON DISK, so seven new judged acts re-rank the crawl block whether or not
// anyone regenerates the file. Regenerating it is therefore not housekeeping; leaving it
// stale would serve a person's old six lines from an edge cache no CACHE_VERSION reaches.
// What this section requires is that the move is THIS wave's: only House members, only the
// three chips the wave argues a direction on, nobody gained or lost a snapshot, and the
// no-pole key printed no tier anywhere.
{
  const line = (r) => [r.p, r.i, r.c].filter(Boolean).join(" · ");
  const now = JSON.parse(R("db/share-index.json")).personRecord || {};
  let head = {};
  try { head = JSON.parse(execFileSync("git", ["show", "HEAD:db/share-index.json"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })).personRecord || {}; } catch { /* no git */ }

  // POST-MERGE DURABILITY, and it is worth being exact about what inverted. Everything
  // below diffs the tree against HEAD, and it was written while F9's own regeneration was
  // still unmerged: `moved` was F9's own subjects and `added` was empty, because F9 admits
  // nobody to the roster. Both readings flip the moment F9 lands — HEAD then holds F9's
  // snapshot, so F9 moves nothing against it — and `added` flips again under any later wave
  // that ADMITS members, because a roster record with a readable formal pattern IS a
  // snapshot entry by construction. Roster wave federal_roster_r1_sep2026 adds 307 of them
  // and it does it precisely because 7,298 recorded House positions had no slug to land on.
  //   So the comparison splits. The assertions that are about F9 keep their teeth while F9
  // is the newest thing in the tree; the assertions that are about EVERYBODY ELSE are
  // restated in a form no later wave can satisfy by accident — nobody may lose a snapshot,
  // and no pid HEAD already had may have a single line change. That pair is STRICTER than
  // the count equality it replaces: an equality is satisfied by swapping one person for
  // another, and a byte comparison of every pre-existing block is not.
  if (Object.keys(head).length) {
    const added = Object.keys(now).filter((pid) => !head[pid]);
    const lost = Object.keys(head).filter((pid) => !now[pid]);
    eq(lost.join(", "), "", `a person lost their crawl-block snapshot (${lost.length})`);

    const moved = Object.keys(now).filter((pid) =>
      (head[pid] || []).map(line).join("\n") !== now[pid].map(line).join("\n"));

    if (f9Unmerged) {
      eq(Object.keys(now).length, Object.keys(head).length,
        "the regenerated snapshot holds a different number of people");
      eq(added.join(", "), "", `a person gained a crawl-block snapshot they did not have (${added.length})`);
      ok(moved.length > 0, "seven judged acts moved nobody's six lines — the snapshot is stale");
    } else {
      // F9 is merged. Its own product is HEAD's, so it can no longer be seen to move; what
      // it can still require is that nothing of anybody else's moved underneath it.
      const changed = Object.keys(head).filter((pid) =>
        (now[pid] || []).map(line).join("\n") !== head[pid].map(line).join("\n"));
      eq(changed.slice(0, 8).join(", "), "",
        `${changed.length} pid(s) HEAD already had had their crawl block rewritten by a later wave`);
      for (const pid of added) {
        ok(Array.isArray(now[pid]) && now[pid].length > 0,
          `${pid} was added to the snapshot with no lines — an empty entry is not a record`);
      }
    }

    // Every line that appeared is on a chip this wave writes a direction on. A later wave's
    // newly admitted members are exempt: they are not in HEAD's snapshot at all, so their
    // lines are not F9's snapshot moving — they are somebody's first record appearing, and
    // which chips it lands on is that wave's argument to answer, not this one's.
    const CHIPS = ["Tough on Crime", "Protect LGBTQ+ Rights", "Climate Action & Clean Energy"];
    const strayChip = [];
    for (const pid of moved) {
      if (!head[pid]) continue;
      const before = (head[pid] || []).map(line);
      for (const l of now[pid].map(line)) {
        if (before.includes(l)) continue;
        if (!CHIPS.some((c) => l.includes(c))) strayChip.push(`${pid}: ${l}`);
      }
    }
    eq(strayChip.slice(0, 5).join(" | "), "",
      `the snapshot gained ${strayChip.length} line(s) on a chip this wave does not write`);

    // The no-pole key prints no tier, so it may not appear as a line at all.
    const noPoleLabel = "Whose Rule Governs";
    const poled = Object.keys(now).filter((pid) => now[pid].some((r) => line(r).includes(noPoleLabel)));
    eq(poled.slice(0, 5).join(", "), "",
      `${NO_POLE_KEY} printed a tier in the crawl block for ${poled.length} person(s)`);

    // The brief's own smoke test, in the artifact a scraper reads: bmoore moves, lee cannot.
    if (now.lee && head.lee) {
      eq(now.lee.map(line).join("\n"), head.lee.map(line).join("\n"),
        "/p/lee's crawl block moved on a House-only wave");
    }
    if (now.bmoore && head.bmoore && f9Unmerged) {
      ok(now.bmoore.map(line).join("\n") !== head.bmoore.map(line).join("\n"),
        "/p/bmoore's crawl block did not move, though the wave records seven votes of theirs");
    }

    // And the wave says so in writing, with the number it actually moved.
    const disc = String(decide.readDisclosure.theOfflineSnapshotThisWaveAlsoMoves || "");
    ok(disc.length > 400, "the wave does not disclose that it moves the offline snapshot");
    // Once F9 is merged `moved` is 0 against HEAD by construction, and asking the
    // disclosure to carry a 0 would be asking it to lie about what the wave did.
    if (f9Unmerged) ok(disc.includes(String(moved.length)), "the snapshot disclosure does not carry the number it moved");
    ok(/no-pole|states_federal_power/.test(disc), "the snapshot disclosure does not say why the fourth key gains no line");
    ok(/bmoore/.test(disc) && /lee/.test(disc), "the snapshot disclosure does not name the smoke test");
  }
}

// ── 9. no party word in anything a reader sees ──────────────────────────────
{
  const PARTY = /\b(Republicans?|Democrats?|Democratic|GOP|partisan|bipartisan|left-wing|right-wing)\b/i;
  let scanned = 0;
  const scan = (text, where) => {
    if (typeof text !== "string" || text.length < 8) return;
    scanned++;
    const m = PARTY.exec(text);
    ok(!m, `${where} carries the party word "${m ? m[0] : ""}"`);
  };
  // The mechanism prose is the reader-facing copy this wave ships.
  const mechStart = mech.indexOf("Federal wave F9: the contested House amendments");
  const mechNew = mechStart === -1 ? "" : mech.slice(mechStart, mech.indexOf("\n  };", mechStart));
  for (const m of mechNew.split(/\n    '/).slice(1)) scan(m, "a _DOS_MECH entry");
  // And the decision record's own reasoning, which the brief bars party framing from too.
  const walk = (node, path) => {
    if (typeof node === "string") return scan(node, path);
    if (Array.isArray(node)) return node.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (node && typeof node === "object") for (const [k, v2] of Object.entries(node)) walk(v2, `${path}.${k}`);
  };
  walk(decide, DECIDE);
  ok(scanned >= 100, `only ${scanned} strings were scanned for party language`);
  // The MEASUREMENT survives. byParty is a fact off the clerk's document; deleting it to
  // pass a language check would throw away a chamber measurement.
  for (const v of votes.votes)
    ok(v.partyTotals && Object.keys(v.partyTotals).length >= 2,
      `${v.measure.number}: the chamber's party split is gone — it is a measurement off the source, kept out of the reasoning, not deleted`);
  ok(votes.votes.some((v) => v.memberVotes.some((r) => r.isParty === "against_party")),
    "no cell in the whole wave is against_party — is_party was probably not recomputed from the document's own tally");
}

// ── 10. the twin boot: only the mechanism file moves, and only inside it ────
{
  const FILES = [
    "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "consistency.js", "voting-record.js", "word-action.js", "issue-scope.js",
  ];
  const headSrc = (f) => {
    try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
    catch { return null; }
  };
  // consistency.js is the one booted file this wave may touch, because seven judged acts
  // owe seven curated pairs. Everything else must be byte-identical: DM unchanged, formal
  // rows moving only on keys this wave writes.
  // Checked as two separate things, because they fail for opposite reasons. The wave OWES a
  // change to consistency.js; it FORBIDS a change to any other booted file. Folded into one
  // equality those two share a message, and a later wave that legally touches a booted file
  // gets blamed for the missing consistency.js edit — or worse, hides it. cmp-data.js is on
  // the allowed side because federal_roster_r1_sep2026's entire product is 315 new CMP_DATA
  // identity rows; test-vr-federal-wave-f8.mjs section 8 prices that change as additive and
  // proves no existing row's judged surface moved, and the DM checks in this file already
  // prove the engine reads it the same way.
  // stance-helpers.js is on the allowed side for the person-file chrome pass (v103), as a
  // SEAM and not a licence: the file is still compared byte for byte everywhere outside
  // _pdxStanceRecordStats, and what changed inside that span is argued below. F9 has no
  // stake in it — the span counts rows the record lane already holds and answers whether
  // the lane has answered at all. No floor, no mapping, no weight, no roll.
  // alignment-tool.js is on the allowed side for the issue-family pass (v109), as a
  // REGION and not a licence: CORE_NATIONAL_ISSUES, the site's only issue taxonomy and
  // declared in that file below ISSUE_MAP, named a parent for 97 of the 121 published
  // keys and left 24 with none — labels, chips and ledgers with no branch to sit on.
  // Finishing that table is the only thing in the file that moved, and the rest of it is
  // still compared byte for byte, so ISSUE_MAP itself, every scope note and the whole
  // alignment engine stay pinned. F9 has no stake in the block: it lists which keys
  // belong under which heading and reads no roll, no floor and no member.
  // issue-scope.js is on the allowed side for the issue-file doors pass (v133), as an
  // ADDITION and not a licence. F9 has the strongest possible stake in this file and
  // the least to fear from an addition to it: this wave REFUSED two amendments on
  // rural_ag in writing, and the reason it wrote down was that the key had no argued
  // boundary. Writing that boundary is the refusal being answered, not overturned —
  // the two amendments are still refused, on file, by number. What the check below
  // requires is that the file is additive: every line HEAD has is still here, in
  // HEAD's order and with HEAD's bytes, so no boundary already shipped can be widened
  // to admit a row a wave declined, and the honest blank stays the honest blank.
  const MAY_MOVE = ["consistency.js", "cmp-data.js", "stance-helpers.js", "word-action.js",
    "alignment-tool.js", "issue-scope.js"];
  const has = (x, n, m) => ok(String(x).includes(n), `${m} — missing ${JSON.stringify(n)}`);
  const touched = FILES.filter((f) => { const h = headSrc(f); return h !== null && h !== R(f); });
  const strayBooted = touched.filter((f) => !MAY_MOVE.includes(f));
  eq(strayBooted.join(", "), "",
    `F9 changed a booted file it has no business editing (${strayBooted.join(", ") || "none"})`);
  if (touched.includes("alignment-tool.js")) {
    assertParentTableIsTheOnlyMove({ ok, eq }, headSrc("alignment-tool.js"), R("alignment-tool.js"), "F9");
  }
  if (touched.includes("issue-scope.js")) {
    // ADDITIVE, AND THE ADDITION IS A TRANSCRIPTION. Line by line against HEAD: an
    // edit or a removal anywhere fails, which is what keeps a shipped boundary from
    // being widened to admit an instrument some wave refused. Then the new keys are
    // named, and each one is required to carry all four parts a scope entry has —
    // what is in, what is out, which way the pole runs, and the note that says when
    // it was written — because a half-written boundary is the state this pass exists
    // to end. The prose itself is a curator's, transcribed from the argued comment
    // over the same key in alignment-tool.js, so the two cannot disagree; nothing
    // here generates a definition and F9's own refusals are unaffected either way.
    const hs = headSrc("issue-scope.js"), ns = R("issue-scope.js");
    const hl = hs.split("\n"), nl = ns.split("\n");
    let kept = 0;
    for (const l of nl) if (kept < hl.length && l === hl[kept]) kept++;
    eq(kept, hl.length,
      "issue-scope.js edited or dropped a line — a boundary already on file is not a later pass's to " +
      "rewrite, and widening one is how a refused instrument gets admitted without a wave");
    const keysOf = (src) => [...src.matchAll(/^ {4}([a-z0-9_]+): \{$/gm)].map((m) => m[1]);
    const before = keysOf(hs), after = keysOf(ns);
    eq(before.filter((k) => after.indexOf(k) < 0).join(", "), "", "a key lost its boundary");
    const gained = after.filter((k) => before.indexOf(k) < 0);
    ok(gained.length > 0, "issue-scope.js changed without any key gaining a boundary");
    for (const k of gained) {
      const body = ns.slice(ns.indexOf(`\n    ${k}: {`)).split("\n    },")[0];
      for (const part of ["inn:", "out:", "pole:", "note:"])
        has(body, part, `the boundary written for ${k} has no ${part.slice(0, -1)}`);
      ok(!/\d\s*%|score|floor|MIN_/i.test(body), `${k}'s boundary carries a figure, a score or a floor`);
      ok(!/republican|democrat|partisan|\bGOP\b/i.test(body), `${k}'s boundary frames the key by party`);
    }
    ok(ns.includes("var NO_DEF = 'No definition on file yet.';"),
      "the honest blank's copy moved — a key with no boundary must still say so in those words");
    for (const n2 of ["H.Amdt. 202", "H.Amdt. 207"])
      ok(!ns.includes(n2), `issue-scope.js names ${n2} — a boundary is not the place a wave's refusal is re-litigated`);
  }
  if (touched.includes("stance-helpers.js")) {
    const sa = carveSeams(headSrc("stance-helpers.js"), SH_SEAMS, "HEAD", "stance-helpers.js", ok);
    const sb = carveSeams(R("stance-helpers.js"), SH_SEAMS, "now", "stance-helpers.js", ok);
    eq(sb.pinned, sa.pinned,
      "stance-helpers.js changed outside the record-CTA stats seam — the stance resolver the " +
      "whole profile is built from is not a chrome pass's to touch");
    assertStanceHelpersSeam(sb.bodies, { has, ok });
  }
  // word-action.js, the brief slice-line pass (v104), on the same seam terms: the
  // renderer is compared byte for byte everywhere outside three named spans, and
  // what is inside them is argued rather than excused. F9 has no stake in it: the span reads no mechanism prose, no refusal and no mapping — it names the documents the patterns came from.
  if (touched.includes("word-action.js")) {
    const wa = carveSeams(headSrc("word-action.js"), WA_SEAMS, "HEAD", "word-action.js", ok);
    const wb = carveSeams(R("word-action.js"), WA_SEAMS, "now", "word-action.js", ok);
    eq(wb.pinned, wa.pinned,
      "word-action.js changed outside the slice gate and its two mounts — the letterhead the " +
      "whole formal read is rendered from is not a copy pass's to touch");
    assertWordActionSeams(wb.bodies, { has: has, eq, ok });
  }
  if (f9Unmerged) {
    ok(touched.includes("consistency.js"),
      "consistency.js is byte-identical to HEAD, though this wave owes seven judged acts seven curated pairs");
  } else {
    // F9's pairs are HEAD's now. What survives is that they are still there.
    const cj = R("consistency.js");
    for (const n2 of NUMBERS) ok(cj.includes(n2), `${n2} lost its curated mechanism pair from consistency.js`);
  }

  // THE APPEND-ONLY WALL, CHECKED BY HALVES. A diff line count cannot tell an append from
  // an edit that happens to add lines, so the file is split at the _DOS_MECH literal and
  // each half is compared to HEAD's corresponding half.
  const head = headSrc("consistency.js");
  if (ok(head !== null, "HEAD's consistency.js is unreadable — the append-only wall is unchecked")) {
    const MARK = "  var _DOS_MECH = {";
    const CLOSE = "\n  };\n";
    const cut = (src) => {
      const a = src.indexOf(MARK);
      const b = src.indexOf(CLOSE, a);
      return [src.slice(0, a), src.slice(a, b), src.slice(b)];
    };
    const [hBefore, hLit, hAfter] = cut(head);
    const [nBefore, nLit, nAfter] = cut(R("consistency.js"));
    // ABOVE THE LITERAL, WITH TWO NAMED SEAMS. The person-file chrome pass renamed the
    // official scope's empty copy and split an empty key list from an empty voting record
    // in the ladder that chooses it — both above the literal, neither arithmetic. A flat
    // byte compare would forbid a copy fix this wave has no stake in, so the two spans are
    // cut by anchors unique on both sides, the remainder is compared byte for byte, and
    // what is inside is argued: no floor, no band, no weight, no score, no key.
    const ca = carveSeams(hBefore, CJ_SEAMS, "HEAD", "consistency.js", ok);
    const cb = carveSeams(nBefore, CJ_SEAMS, "now", "consistency.js", ok);
    eq(cb.pinned, ca.pinned,
      "consistency.js changed ABOVE the _DOS_MECH literal outside the named copy seams in scripts/v103-chrome-seams.mjs");
    // BELOW THE LITERAL, WITH THE TWO EXPORT SPANS CUT OUT. The issue-ledger pass
    // (v108) added four export names to the formal-pattern index so the issue desk
    // could read the index's own row instead of characterising the record twice.
    // Names, not logic — argued span by span in scripts/v103-chrome-seams.mjs — and
    // everything else below the literal is still compared byte for byte.
    const da = carveSeams(hAfter, CJ_SEAMS_BELOW, "HEAD", "consistency.js", ok);
    const db = carveSeams(nAfter, CJ_SEAMS_BELOW, "now", "consistency.js", ok);
    assertConsistencySeams(cb.bodies, { has, ok }, db.bodies);
    eq(db.pinned, da.pinned, "consistency.js changed BELOW the _DOS_MECH literal outside the two named export spans");
    ok(nLit.startsWith(hLit.replace(/\s*\}\s*$/, "").replace(/\}$/, "")) || nLit.startsWith(hLit.slice(0, hLit.length - 5)),
      "the _DOS_MECH literal was rewritten rather than appended to");
    if (f9Unmerged) ok(nLit.length > hLit.length, "the _DOS_MECH literal did not grow");
    else ok(nLit.length >= hLit.length, "the _DOS_MECH literal SHRANK — a later wave removed mechanism copy");
  }

  // And the engine still boots, so the harness is testing a working tree.
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of FILES) { try { vm.runInContext(R(f), ctx, { filename: f }); } catch { /* tolerated, as F7 and F8 do */ } }
  ok(typeof win === "object", "the sandbox did not boot");

  // The files this wave declares. Anything else modified is undeclared and fails.
  // The last two are the cost of being the first wave since F7 to add a judged act. F7's
  // harness counted its twenty-eight mechanism pairs as the DIFF from HEAD and F8's
  // asserted consistency.js was byte-identical to it — both true of the trees they were
  // written in, and both untrue in a tree where a later wave appends. Each was rewritten to
  // check the claim its own wave actually needs (F7: its twenty-eight are present and none
  // was re-appended; F8: it added no pair of its own) and to survive a later append. That
  // is the same move F8 made on F7's roster assertion, and it is declared here rather than
  // waived quietly.
  // sitemap.xml is generated, never hand-edited: gen-sitemap.mjs reads the migrations
  // for openable /b/ addresses, so seven new amendment measures with issue mappings are
  // seven new addresses. Regenerating it is the wave paying for its own rows — the diff
  // is exactly seven insertions and no deletions, and test-sitemap-bills fails without it.
  //   db/share-index.json is the same kind of file for a different reader: the offline
  // snapshot the share-preview edge injects as the crawl block on /p/<pid> before any
  // JavaScript boots. gen-crawl-record.mjs boots the real consistency.js and reads the
  // migrations on disk, so seven new judged acts re-rank the six-line window whether or
  // not anyone regenerates it — a device holding the old copy would serve a person's old
  // six lines. The section below requires the move to be THIS wave's.
  const DECLARED = new Set([
    // The issue-family pass (v109) — the one parent table finished, the family module
    // that reads it, the two surfaces that stopped grouping issues their own way, and the
    // shell bump that ships them together. See the booted-file note above for why the
    // taxonomy had to be finished in place rather than mirrored somewhere new.
    "alignment-tool.js", "pdx-issue-family.js", "door1-workspace.js", "door1-workspace.css",
    "stance-tree.js", "index.html", "CORE_NATIONAL_ISSUES.md",
    "scripts/v103-chrome-seams.mjs", "scripts/test-issue-family.mjs",
    "scripts/test-issue-record-ledger.mjs", "scripts/test-stance-tree.mjs",
    "scripts/test-door-one-collapse.mjs", "scripts/test-vr-federal-wave-f5.mjs",
    "scripts/test-vr-federal-wave-f6.mjs", "scripts/test-vr-federal-wave-f9.mjs",
    "scripts/test-vr-federal-roster-r1.mjs", "scripts/test-vr-federal-roster-r2.mjs",
    "scripts/test-person-crawl-block.mjs","consistency.js", "sw.js", ISSUE_SEED, "sitemap.xml",
    "db/share-index.json",
    "scripts/test-vr-federal-wave-f7.mjs", "scripts/test-vr-federal-wave-f8.mjs",
    // Everything below belongs to a LATER wave, declared on the terms F8 established rather
    // than forbidden. federal_roster_r1_sep2026 admits 315 sitting House members because the
    // House corpus held 7,298 recorded positions the fail-closed ingest had to skip for want
    // of a roster slug: that is 315 CMP_DATA identity rows, 315 BROWSE_PHOTOS portraits, a
    // member map and roster ledger that grow, and — because three generators froze a roster
    // list into an APPLIED migration — three generators that must name the new wave or stop
    // regenerating byte-identically. F9's own migration and its rows are untouched by all of
    // it, which is what the sections above and below actually check.
    "cmp-data.js", "compare-hub.js",
    "db/vr-member-map.json", "db/vr-roster-admitted.json",
    "scripts/vr-gen-member-map.mjs",
    "scripts/vr-gen-federal-wave-f2-migration.mjs",
    "scripts/vr-gen-federal-wave-f3-migration.mjs",
    "scripts/vr-gen-federal-wave-f8-migration.mjs",
    "scripts/vr-gen-federal-depth-migration.mjs",
    "scripts/test-vr-federal-wave-f9.mjs",
    // The remainder of that wave's footprint, declared on the same terms. Every earlier
    // wave's harness pins the tree against `git show HEAD:<file>`, so a roster wave has to
    // walk back through all of them and make each guarantee SURVIVE the growth — an
    // equality that could only hold in its own pre-merge tree becomes the substantive thing
    // it stood in for (nobody lost, nothing reordered, no judged surface on an addition).
    // No assertion was removed. db/share-stances.json is a regenerated whole document like
    // sitemap.xml and db/share-index.json above; FINANCE_INTEGRITY.md restates its own
    // disclosure denominator; and scripts/stance-worklist.mjs is a bug fix the growth
    // exposed rather than a wave edit — its --json report crossed 64 KiB at 1108 roster
    // records, which is where a process.exit() that truncates a pipe finally showed itself.
    "db/share-stances.json",
    "FINANCE_INTEGRITY.md",
    "scripts/stance-worklist.mjs",
    "scripts/test-vr-federal-wave-f3.mjs",
    "scripts/test-vr-federal-wave-f4.mjs",
    "scripts/test-vr-federal-wave-f5.mjs",
    "scripts/test-vr-federal-wave-f6.mjs",
    "scripts/test-person-crawl-block.mjs",
    "scripts/test-identity-integrity.mjs",
    "scripts/test-depth-no-score-drift.mjs",
    // federal_roster_r2_sep2026, on those same terms: twelve members whose votes already
    // resolved through db/vr-member-map.json but whom the roster did not name, so
    // gen-crawl-record skipped them. R1's harness carried the roster size as a literal and
    // moved 1108 → 1120; hero-receipt-data.js is regenerated, and its existing selection
    // rules picked up susie_lee's already-stored veterans receipt once she had a roster row
    // to be selected from. Neither is a judgement and neither touches F9's rows.
    "scripts/test-vr-federal-roster-r1.mjs",
    "scripts/test-vr-federal-roster-r2.mjs",
    "hero-receipt-data.js",
    // scripts/test-who-represents-me.mjs on the same terms. It hard-stopped on its own
    // instruction once R2 closed the last two partial-Senate states (MS, OH): its
    // partial-coverage assertions had nothing left to measure. They were not deleted —
    // the shipped-data count is now asserted as full coverage, and the one-seat behaviour
    // is driven against a roster built from real records instead.
    "scripts/test-who-represents-me.mjs",
    // The person-file chrome pass (CACHE_VERSION v103), on those same later-wave terms.
    // It writes no roll, no mapping, no key and no admission — it changes what the
    // reader is told while the roster is still loading. person-file.js stopped claiming
    // we carry nobody by a name whose row is in the cmp-data.js it is reading, and kept
    // document.title and the breadcrumb on the person whose file is open.
    // profiles-full.js and stance-helpers.js stopped letting the mid-page card call a
    // record "still being built" underneath a letterhead counting its acts. The two
    // harnesses named here pinned the arrival poll's exit as a literal; that exit was
    // funnelled through a single stopWait() so the unknown-pid notice could be gated on
    // the wait, and both pins follow the spelling while keeping the behaviour.
    "person-file.js",
    "profiles-full.js",
    "stance-helpers.js",
    "sw.js",
    "scripts/test-vr-federal-wave-f7.mjs",
    "scripts/test-vr-federal-wave-f8.mjs",
    // The formal brief's slice-line pass (CACHE_VERSION v104), on those same
    // later-wave terms. It writes no roll, no mapping, no key and no admission:
    // word-action.js prints one locked sentence under the pattern list on a file
    // whose whole readable formal lane is a small set of House rolls from one
    // Congress — "Pattern from 23 House rolls on file — not a career score." —
    // and word-action.css sizes it as the muted note it is. The reason a wave
    // like this one is the file that has to declare it: R1 attached 7,138 cells
    // across 23 House rolls, so several hundred new files now open on the same
    // three chips off the same 23 documents, and nothing on the block said which
    // of "this is the slice we hold" and "this is who they are" a reader was
    // looking at. The shared seam module carries the three spans; the suites
    // named here import it. Every count, chip, tier and Direction Match figure is
    // byte-identical, which the twin boot above has just proved.
    "word-action.js",
    "word-action.css",
    "scripts/v103-chrome-seams.mjs",
    "scripts/test-brief-slice-disclosure.mjs",
    "scripts/test-vr-federal-wave-f5.mjs",
    "scripts/test-vr-federal-wave-f6.mjs",
    "scripts/test-vr-federal-roster-r1.mjs",
    "scripts/test-vr-federal-roster-r2.mjs",
    "scripts/test-person-file-perf.mjs",
    "scripts/test-seed-yields-to-record.mjs",
    // The issue desk's record-ledger pass (CACHE_VERSION v108), on those same
    // later-wave terms. It writes no roll, no mapping, no key and no admission: it
    // changes what the ISSUE side of the desk prints once a key is picked. The pane
    // used to answer a narrow key with an empty no-vehicle sentence, or rank the
    // people on it by how well they back up their words; it now files them by what
    // the formal record on that key did — advanced it, cut against it, ran both
    // ways, thin, no side read — reading the formal-pattern index's OWN row for the
    // band so the desk and the person file cannot characterise one record two ways.
    // consistency.js's five spans are the extraction and the export that made that
    // possible and are carved and argued in the shared seam module above; the four
    // files below are the pane, its stylesheet, the Eye's issue hit, and the one
    // block of CSS that hit needs. Every count, chip, tier and Direction Match
    // figure is byte-identical, which the twin boot above has just proved.
    "door1-workspace.js",
    "door1-workspace.css",
    "all-seeing-eye.js",
    "index.html",
    "scripts/test-door-one-workspace.mjs",
    "scripts/test-door-one-collapse.mjs",
    // The record-first card pass (CACHE_VERSION v111), on those same later-wave
    // terms. It writes no roll, no mapping, no key, no floor and no admission: it
    // changes what the HOMEPAGE carousel card prints. Card N of 6 is the first
    // person-file a stranger sees, and it was the last surface still painting the
    // old card language — three untyped issue rows and a loud Word-vs-Action
    // percent as the hero — on a site whose person file had moved to coloured issue
    // rows, a 🏛 RECORD badge per characterised row and split counts spelled out.
    // The reason a wave like this one is the file that has to declare it: R1 and R2
    // between them put 1,120 files behind that carousel, so the card is now the way
    // most readers meet the record at all, and it was making a stronger claim with
    // a percentage than the rows underneath it were allowed to make with words.
    // consistency.js's five spans and issue-colors.js's one are the NAMES that made
    // the shared face possible — the badge's lane word and fill rule, the two row
    // builders' published fields, and styleFor()+isCore() in one shape — all carved
    // and argued in the shared seam module above. Every count, chip, tier, side word
    // and Direction Match figure is byte-identical, which the twin boot above has
    // just proved.
    "hero-showcase.js",
    "profile-card.js",
    "issue-colors.js",
    "scripts/test-hero-showcase.mjs",
    "scripts/test-homepage-card-lane.mjs",
    // The issue file's ADDRESS (CACHE_VERSION v112), on the same later-wave terms
    // again, and this one adds no surface at all. Door 1's issue mode has painted a
    // child ledger for a long time — crumb, themed chips, census, five bands,
    // measures, the honesty lines — and a chip tap, the typeahead and OPEN all
    // mounted it. What did not exist was /i/<key>: no citation, so the Eye's own
    // issue hit, a topic-tree leaf and a share sheet could point at a person, a
    // bill or a roll call and never at THE ISSUE. The fix is an extraction, not a
    // second page: door1-workspace.js's issueProfileHtml(key) is the ledger paint
    // lifted out of issueDeskHtml() and exported as PDXDoor1.issueProfile, and the
    // new module owns the address and paints nothing at all — it reads a key out of
    // the path, resolves it through the desk's own resolver, and hands it to
    // window.pdxDoor1Issue, the same entry point a chip tap uses. The reason a wave
    // like this one declares it: R1 and R2 put 1,120 member files behind these
    // keys, so "who advanced this and who cut against it" is now a reading over a
    // real roster, and it was the one reading on the site a reader could not send
    // to anybody. Every count, band, tier, measure and Direction Match figure is
    // byte-identical, which the twin boot above has just proved; the address module
    // touches no record at all.
    "pdx-issue-profile.js",
    "pdx-issue-family.js",
    "stance-tree.js",
    "stance-tree.css",
    "netlify.toml",
    "scripts/test-issue-file-address.mjs",
    "scripts/test-issue-family.mjs",
    // The Eye's two lanes, and an executive act that stops pretending it needed a
    // vote (CACHE_VERSION v115), on those same later-wave terms once more. It
    // writes no roll, no mapping, no key, no floor and no admission: it changes
    // which of two questions a surface is answering. The All-Seeing Eye ranked
    // issue files, core bundles, spotlights and name hits into one list called
    // "Issues & Hot Topics", so a sourced investigation and a formal issue file
    // competed on one score for one slot and `land pres` could put a wildfire
    // spotlight above Protect Public Lands; the results now carry a Formal
    // record | Public & spotlights control, the query string does not move when a
    // reader flips it, and "people with a formal row first" is a stable partition
    // read off consistency.js's own formalPatternIndex — no score, no party term,
    // no percentage in either lane. bill-detail.js is the other half: a
    // presidential memorandum was greeted with "No recorded roll-call votes for
    // this measure yet", which tells a reader a vote was due and this archive has
    // mislaid it, and the "yet" promises a tally that will never arrive. A
    // measure-level isExecutiveAct(m), mirroring db/exec-action-types.json, now
    // prints the process — one official issued it, it does not go to a roll call,
    // the formal record is the issuance — and prints "No plain-language summary on
    // file yet" where no such summary exists rather than manufacturing one from a
    // title. A chamber measure whose roll-call file is genuinely empty still says
    // so, which is the guard that keeps the fix from becoming a blanket excuse.
    // The reason a wave like this one is the file that has to declare it: R1 and
    // R2 put 1,120 member files behind these keys, so the Eye is how a reader
    // reaches the formal record at all, and the executive acts already on file are
    // the rows whose emptiness the old sentence was mischaracterising. Every
    // count, band, tier, measure and Direction Match figure is byte-identical,
    // which the twin boot above has just proved; all-seeing-eye.js, index.html and
    // sw.js are declared above already.
    "bill-detail.js",
    "scripts/test-chew-identity.mjs",
    "scripts/test-exec-vocab.mjs",
    "scripts/test-person-links.mjs",
    // AND THE MANDATE LANE (CACHE_VERSION v116), the follow-on to that same pass
    // and the same kind of change: no roll, no mapping, no key, no floor and no
    // admission moves, only which question a surface is answering. Two lanes left
    // the site's third kind of document with nowhere honest to sit. A People's
    // Mandate item is a PROPOSED VEHICLE: in the public lane it reads as a quote,
    // a thing somebody SAID, when a reform nobody has spoken about yet is not
    // that; in the formal lane it reads as a measure, a thing that was VOTED ON,
    // when a proposed vehicle has no tally at all. So the Eye's control is
    // three-state now — Formal record | Public & spotlights | Mandate — the first
    // two hold zero mandate rows, the third holds reforms and nothing else, and
    // the mandate count sits in its own slot rather than in either of theirs, so
    // no formal denominator grows by one because a reform was filed. A mandate row
    // carries no formal pattern chip, no Word-vs-Action figure, no percentage, no
    // party letter and no "backs it up", and its door is the mandate surface that
    // already exists (_pdxMandateFocusReform, then #agenda) rather than anything
    // invented here. An empty lane still ships, with the locked sentence "No
    // mandate on file for this search. A mandate is a proposed vehicle — not a
    // vote and not a quote." — because empty is the honest state and a hidden lane
    // is not an answer. The reason a wave file declares it: R1 and R2 put 1,120
    // member files behind these keys, the Eye is how a reader reaches any of them,
    // and a mandate must never become a row in a formal count. It cannot: nothing
    // in this pass touches formalPatternIndex, Direction Match or Word vs Action,
    // and the twin boot above has just proved every figure byte-identical.
    // all-seeing-eye.js, index.html and sw.js are declared above already.
    "scripts/test-eye-lanes.mjs",
    "scripts/test-eye-mandate-lane.mjs",
    // Two neighbouring suites read the Eye's own source, and a third lane moved
    // what they were anchored to: test-eye-warming.mjs mutates the empty branch to
    // prove its readiness check is load-bearing (that branch now answers the
    // mandate lane first, so the mutation is re-anchored through it, and the check
    // it removes is unchanged), and test-person-links.mjs enumerates which rows may
    // legitimately stay a <button> rather than carry an address (a proposed vehicle
    // has no /i/ or /p/ file, so it is the third such row). Neither suite's claim
    // was weakened: both still fail on the defect they were written for.
    "scripts/test-eye-warming.mjs",
    // AND THE INSTRUMENT SUMMARIES (CACHE_VERSION v118), the third pass of that
    // same shape on this file's terms: no roll, no mapping, no key, no floor and
    // no admission moves, only where an already-stored sentence is printed. A
    // measure sheet stated "No plain-language summary on file yet" honestly and
    // then let the title do the explaining, so a presidential memorandum whose
    // name is "Delivering Emergency Price Relief for American Families and
    // Defeating the Cost-of-Living Crisis" described itself to a reader in words
    // that name no rule, no deadline and no dollar. The archive's own description
    // column was on the page the whole time, printed only inside a closed
    // disclosure below the census. bill-detail.js now reads vr_measures.summary
    // through ONE helper and prints it in ONE place: a lever-length description
    // leads the identity block above the topic chips with the official Federal
    // Register URL repeated beside the prose, an ingested section-by-section wall
    // stays folded where it was, and a column holding nothing but the measure's
    // own title is read as empty so the locked line prints instead of a slogan
    // wearing a summary's label. Nothing is generated from a title. The prose
    // itself is data — one migration fills the column for two already-mapped
    // executive instruments from the Federal Register text those sheets already
    // cite, levers only, with the document URL recorded beside it — so no engine
    // file learned to write copy. The reason this file declares it: R1 and R2 put
    // 1,120 member files behind these keys, and the executive acts already on
    // file are the rows a reader reaches with no tally to read, which makes the
    // description the only thing on the sheet that says what the instrument does.
    // Two neighbouring suites were anchored to the old placement and are
    // re-anchored, not weakened: test-bill-letterhead.mjs and
    // test-bill-noise-pass.mjs both used a mid-length fixture summary as their
    // "below the fold" landmark, which this pass promotes into the identity
    // block, so each fixture was lengthened to the omnibus wall its own comment
    // describes and the letterhead suite gained a seam assertion that a SHORT
    // summary does not fold — neither suite's claim was softened, and both still
    // fail on the defect they were written for. isExecutiveAct copy, the
    // disapproval clarifier and "Standing describes the instrument, not its
    // effect." are byte-identical, a chamber measure with a genuinely empty
    // roll-call file still says so, and every count, band, tier, measure and
    // Direction Match figure is unchanged, which the twin boot above has just
    // proved. bill-detail.js, index.html and sw.js are declared above already.
    "scripts/test-bill-letterhead.mjs",
    "scripts/test-bill-noise-pass.mjs",
    // AND THE COLD EYE (CACHE_VERSION v119), the third pass on those same terms:
    // no roll, no mapping, no key, no floor, no admission and no score moves,
    // only what a surface is allowed to claim before its own sources have
    // arrived. The Eye is a plain synchronous script and every index it searches
    // is deferred, so its 8-second readiness ceiling was being timed from a
    // moment when no lane could possibly have loaded; on a slow device the
    // ceiling expired first and a search for a measure the archive holds was
    // answered "The eye finds nothing." The clock now starts when the document
    // is actually parsed, the issue register is a lane of its own rather than
    // riding on the cores, and a category that is still loading prints its own
    // waiting line, so the denial is reachable only from a warm slice that is
    // genuinely empty. The second half is the door: a family or leaf row tapped
    // during that same cold window found neither pdxDoor1Issue nor the desk nor
    // a profile path and did nothing at all, and now waits on a bounded ladder
    // for the door it needs before falling back to the key's own address.
    // bill-detail.js carries the topic chip, which told a reader of a
    // presidential memorandum how "A Yea" would cut on each provision of an
    // instrument that never went to a vote; behind the same measure-level
    // isExecutiveAct(m) predicate the chip now speaks of issuance. The reason a
    // wave like this one is the file that has to declare it: R1 and R2 put 1,120
    // member files behind these keys, the Eye is how a reader reaches them, and
    // an empty answer while the index is cold reads as an archive that does not
    // hold the row. Nothing that ranks, scores, counts or admits was touched —
    // every band, tier, measure and Direction Match figure is byte-identical,
    // which the twin boot above has just proved. all-seeing-eye.js,
    // bill-detail.js, sw.js and scripts/test-eye-warming.mjs are declared above
    // already.
    "scripts/test-eye-formal-family.mjs",
    "scripts/test-exec-act-sheet.mjs",
    // AND THE FAMILY DOOR (CACHE_VERSION v121), the next pass on those same
    // terms: no roll, no mapping, no key, no floor, no admission and no score
    // moves — only which surface a topic destination lands on. A CORE key is a
    // heading over its children and not a leaf file, but the ledger link in a
    // formal bundle footer, the family tag, `#issue=<core>` and the bundle's "N
    // more in this family" all handed that heading to PDXIssueView, which holds no
    // shelf to paint for it and answered instead with a ranked list of PEOPLE —
    // ordered by consistency, filtered R / D / Ind, promising that someone "backs
    // up their words" — where the reader had asked for the record on an issue.
    // Every family destination now calls the desk's one issue door,
    // pdxDoor1Issue(core), which mounts that family's own shelf; a leaf key still
    // opens the leaf census it names; and the party pills are gone from the
    // ranking that remains, which is Public Eye's alone and is linked from no
    // formal footer. The reason a wave like this one declares it: R1 and R2 put
    // 1,120 member files behind these keys and the family shelf is how a reader
    // reaches more than one of them at once, so a footer that promised a ledger
    // and opened a league table sorted by party is this wave's own product handed
    // back misread. Nothing that ranks, scores, counts or admits was touched — no
    // percentage, no Direction Match change, no new key, no roster row, and every
    // band, tier, measure and figure is byte-identical, which the twin boot above
    // has just proved. door1-workspace.js, stance-helpers.js, index.html, sw.js,
    // scripts/v103-chrome-seams.mjs, scripts/test-door-one-collapse.mjs and
    // scripts/test-person-crawl-block.mjs are declared above already.
    "issue-view.js",
    "issue-view.css",
    "scripts/test-door-one-arrival.mjs",
    "scripts/test-issue-family-door.mjs",
    // AND THE TWO ROWS IN THE EYE THAT DID NOT OPEN (CACHE_VERSION v122), the
    // pass after that one. The family row picked the desk without landing on it
    // and the leaf row opened the desk instead of its own file, so both taps read
    // as dead on a page that already had a desk; and a reader scoped to a leaf had
    // no control saying that body has an address. What moved is doors, not
    // readings: pdx-issue-profile.js gained ONE named opener (resolve, refuse a
    // family, raise an already-open file, else commit the same pick and mount the
    // same panel at the same address) and issue-file.js gained focus(), which
    // re-asserts its own overlay and repaints nothing. all-seeing-eye.js splits
    // the two shapes properly and lowers its panel on the way past;
    // door1-workspace.js paints one anchor above the shared body, on the path the
    // address module answers, so the body below it is still byte-for-byte what
    // /i/<key> serves. No band, no tier, no census count, no measure and no figure
    // is reachable from any of it, which is what the twin boot above proves.
    // all-seeing-eye.js, door1-workspace.js, door1-workspace.css,
    // pdx-issue-profile.js, sw.js and scripts/test-eye-formal-family.mjs are
    // declared above already.
    "issue-file.js",
    // AND THE ISSUE FILE'S LETTERHEAD (CACHE_VERSION v123), the pass after that
    // one, and the same terms again: no roll, no mapping, no key, no floor, no
    // admission and no score moves — only what a citable page says about itself
    // before it prints the record. /i/<key> gave the reader the key's NAME and
    // then the census, so a citation landed on a page that never said what the
    // key MEANS, how much was filed under it, or which shelf it came off. The
    // letterhead prints the register's own chip, issue-scope.js's locked boundary
    // (or that module's own "no definition on file yet"), an inventory line of
    // integers, and two jumps; the crumb's family half became a control onto the
    // desk, because a core has no file. The integers are the desk PUBLISHING the
    // census it already ran (PDXDoor1.issueCensus), not a second count, and while
    // the roll-call read is still out the line publishes no figure at all. The
    // body below is byte-for-byte the same builder's string it was before. The
    // reason a wave like this one declares it: R1 and R2 put 1,120 member files
    // behind these keys and /i/<key> is the address a reader cites them from, so a
    // file with no definition on it is this wave's own product handed over
    // unlabelled. Nothing that ranks, scores, counts or admits was touched — no
    // percentage, no Direction Match, no consistency read, no party axis, no new
    // key and no roster row — and every band, tier, measure and figure is
    // byte-identical, which the twin boot above has just proved. door1-workspace.js,
    // issue-file.js, sw.js and scripts/test-issue-family-door.mjs are declared
    // above already.
    "issue-file.css",
    // AND THE SLICE, AND HOW THE ISSUE WAS TESTED (CACHE_VERSION v124), the pass
    // after that one, on the same later-wave terms: no roll, no mapping, no key,
    // no floor, no admission and no score moves. A settled key files hundreds of
    // people across five direction bands, and the file handed a reader all of
    // them in one column with no way to open a slice of it; it also never said
    // how the issue was TESTED — which measures were PRIMARY, which were a
    // provision folded inside something larger, which act on file was floor
    // machinery. The filter row above the bands offers four axes (direction from
    // the index's own bands, vehicle from the standalone and provision counts
    // already on each row, chamber from the office, name typed) and narrows by
    // HIDING rows the builder printed — the builder emits the same string and the
    // chips paint unpressed either way, which is what keeps /i/<key> and the desk
    // one paint. The process block is counts and named measures read off
    // PDXDoor1.issueCensus(key).proc, behind the same busy gate as the inventory,
    // and a sponsorship is never called a vote. No party chip, no sort, no
    // package-borne percentage, no inferred stance, and one census still. The
    // reason a wave like this one declares it: R1 and R2 put 1,120 member files
    // behind these keys, and on a settled key the bands ARE that product — a
    // reader who cannot open a slice of them has been handed a phone book.
    // door1-workspace.js, door1-workspace.css, issue-file.js, issue-file.css,
    // sw.js, scripts/test-issue-file-address.mjs and
    // scripts/test-issue-family-door.mjs are declared above already.
    // THE EYE'S JUDICIAL LANE (CACHE_VERSION v129), on those same later-wave
    // terms. It writes no roll, no mapping, no key, no floor, no admission and no
    // score: it adds a fourth RESULT KIND to the All-Seeing Eye, for an office
    // this wave's arithmetic has never touched and never will. PolitiDex carries
    // 126 complete Utah judge files at /p/<pid>, and the Eye could not find one —
    // its people haystack is the union of CMP_DATA and PROFILES, and a judge is
    // deliberately in neither, because a judge inside CMP_DATA is a judge inside
    // Direction Match, inside a formal-pattern tier and inside the publication
    // floor. So the registry became its own lane rather than a tenant of the
    // roster: judicial-retention.js publishes the locked search vocabulary and
    // the rows, all-seeing-eye.js renders them with no party chip, no ring, no
    // percentage and no formal-act count, and the judge headcount sits in a
    // FOURTH lane-count slot that no denominator reads — so a judge-only query
    // prints Formal 0, Public 0, Mandate 0 and still answers. firebase-boot.js
    // stops promising a roster load over a file that waits on no roster, and
    // judge-file.js hoists the court-keyed public lane into a strip that names
    // the court instead of reading as one judge's record. The reason a wave like
    // this one is the file that has to declare it: R1 and R2 put 1,120 member
    // files behind this search box, and the guarantee that matters here is that
    // none of them moved — every Direction Match read, every lane count and every
    // painted legislative row is byte-identical with this lane and without it,
    // which scripts/test-eye-judge-lane.mjs proves as a twin boot. No judge was
    // added to cmp-data.js, to the publication floor or to compare-the-field.
    // all-seeing-eye.js, index.html and sw.js are declared above already.
    "judicial-retention.js",
    "judge-file.js",
    "judicial-retention.css",
    "firebase-boot.js",
    "scripts/test-judicial-retention.mjs",
    // Federal wave F10 — the wave briefed as "F5: standalone PRIMARYs for the remaining
    // chamber gap", which after rebuilding the census admitted nothing and wrote its
    // reasons instead. Two files change and neither is booted by anything: the read-only
    // census tool gained a `--reach` mode (what a key's ceiling would be if the best
    // possible instrument existed) and had F4's stale comment about the primary wall
    // corrected, and the runbook gained rules 43-46. The seed and its suite are new
    // files, declared here so they stay declared once they are tracked.
    // No migration, no mapping row, no vote seed, no key, no floor — so F8's and F9's
    // own subjects are untouched by construction, and scripts/test-vr-federal-wave-f10.mjs
    // asserts that separately against HEAD.
    "scripts/vr-federal-fpi.mjs",
    "db/vr-ingest-runbook.md",
    "db/vr-federal-mapping-seed-f10.json",
    "scripts/test-vr-federal-wave-f10.mjs",
    // Federal wave F11 — "first acts on empty poled keys": a COVERAGE wave. One roll
    // call (House 119/2/154, On Passage of H.R. 7567) lands on a bill F9 curated and
    // could not read, and one secondary mapping row lands H.R. 6644 on housing_support,
    // whose two passage rolls were already on file. Two keys that read empty for every
    // member of Congress start reading; twenty more are refused in writing with a
    // measured reason each. Landing the roll also made F9's two H.R. 7567 rows sourced
    // to sections struck by H.Amdt. 196 publishable, so both are retracted rather than
    // shipped — measured at zero existing reads lost.
    // Nothing booted changes. The only tracked file this wave edits is the read-only
    // census tool, which gained an in-memory `--seed-override <wave>=<path>` flag so the
    // F11 suite can answer its mutation clause ("drop one admitted mapping and those
    // members return to empty") without rewriting a seed on disk — which is this
    // suite's own pattern and the reason runbook rule 47 exists. The flag discloses
    // itself on stderr, in the --json payload and in the table header, so an overridden
    // run can never be quoted as a measurement.
    // Two gates of earlier waves changed, both because F11 is the first wave whose
    // shape they had not seen, and neither by loosening what they check:
    //   * scripts/test-vr-vote-seed.mjs read "mapped" out of db/vr-issue-seed.json alone.
    //     That file is a deliberately partial mirror (runbook rule 20 — omitting a key is
    //     not a removal), and H.R. 7567's five rows were written by 20260721100000 and
    //     never mirrored, so the first roll to land on it looked like an unmapped measure.
    //     The check now reads the migrations for the same fact, per file and per
    //     (measure, key) pair, minus the pairs a later migration deletes. Measured, not
    //     assumed: across all seventeen vote seeds it admits H.R. 7567 and nothing else,
    //     and the eight measures behind the declinedFacets door — H.R. 1069 and F7's
    //     seven Iran resolutions, all ingested with no issue rows at all — stay behind it.
    //   * scripts/test-vr-federal-wave-f10.mjs asserted the 20261028000000 prefix was
    //     empty. F10's own seed says that stamp is "recorded here and not consumed, so
    //     the next wave takes it", so F11 taking it is the sentence coming true. The check
    //     now allows one file there provided it is not F10's and some mapping seed
    //     declares it — which is the thing F10 actually needs to be able to say.
    // scripts/vr-federal-fpi.mjs and db/vr-ingest-runbook.md are declared above already.
    "scripts/test-vr-vote-seed.mjs",
    "db/vr-federal-mapping-seed-f11.json",
    "db/vr-federal-wave-f11-vote-seed.json",
    "scripts/vr-gen-federal-wave-f11-vote-seed.mjs",
    "scripts/vr-gen-federal-wave-f11-migration.mjs",
    "scripts/test-vr-federal-wave-f11.mjs",
    "netlify/database/migrations/20261028000000_vr_federal_wave_f11.sql",
    // THE PERSON FILE'S SECTION OUTLINE, on those same later-wave terms. The
    // outline shipped at CACHE_VERSION v131 as two new files, so it was untracked
    // when this guard last ran and nothing here had to name it; it is tracked now,
    // and v132 edits it. What it does is name the sections of ONE open person file
    // and scroll to them — a sticky column beside the file on a wide screen, the
    // same list as a chip row under the letterhead on a phone. v132 merges the
    // "Letterhead" and "Formal record" rows into one "Top of file" row, because on
    // a member file the record brief renders immediately under the photo and the
    // two rows went to the same screen. The reason a wave like this one is the file
    // that has to declare it: R1 and R2 put 1,120 member files behind these
    // sections, and the guarantee that matters here is that none of them moved. The
    // outline writes no roll, no mapping, no key, no floor, no admission and no
    // score; it derives its rows by probing the DOM the profile spine already
    // assembled, so a section that did not mount has no row and nothing it does can
    // reorder the file. Its copy is section names only — no figure, no percentage,
    // no party, no Direction Match — and scripts/test-person-outline.mjs proves as a
    // twin boot that every formal-pattern tier and every Direction Match read across
    // 537 member files and all 126 judge files is byte-identical with it and without
    // it. sw.js and index.html are declared above already.
    "person-outline.js",
    "person-outline.css",
    "scripts/test-person-outline.mjs",
    // THE ISSUE FILE'S DOORS (CACHE_VERSION v133), on those same later-wave terms,
    // and this wave has a direct stake in one part of it. It writes no roll, no
    // mapping row, no key, no floor, no admission and no score: it opens doors onto
    // surfaces that already exist. The issue title on all three person×issue
    // surfaces now links to /i/<key>, the address pdx-issue-family.js already
    // owned; the ⓘ beside it mounts issue-scope.js's own copy, or that module's
    // honest blank where no boundary is on file; and the dossier's roll-up renders
    // at one measure instead of two, so the thinnest possible record — one vote on
    // one bill — reaches the measure explainer every deeper file already reached.
    // The sentence on that row is a clipped prefix of the curator's own mapping
    // rationale, never a generated summary.
    //   THE PART F9 HAS A STAKE IN: this wave declined H.Amdt. 202 and H.Amdt. 207
    // on rural_ag, in writing, because the key had no argued-out boundary. That
    // boundary is now written — as a curator's note over the key in
    // alignment-tool.js, transcribed into issue-scope.js — which answers the
    // refusal rather than overturning it. Both amendments are still refused, by
    // number, and section 10 checks that the file only ever gained: no boundary
    // already shipped could be widened to admit a row a wave declined.
    //   Every count, chip, tier, band, side word and Direction Match figure is
    // byte-identical, which the twin boot above has just proved; consistency.js's
    // twelve new spans and word-action.js's one are carved and argued in the shared
    // seam module, and scripts/v103-chrome-seams.mjs now indexes those spans by the
    // name each seam declares rather than by its position in the list.
    //   scripts/gen-sitemap.mjs lists /i/<key> for every key with a boundary on file
    // or at least one mapping in the migrations, reading the app's own modules for
    // both; scripts/vr-measure-addresses.mjs, which it reads, now reports WHICH
    // issue keys the migrations map rather than only how many mappings exist. Person
    // addresses are untouched and sitemap.xml gained addresses without dropping one.
    //   scripts/test-dossier-read.mjs had its one-item rule reversed alongside the
    // renderer and now sweeps the single-item lanes positively: each one is required
    // to teach its measure.
    "issue-scope.js",
    "scripts/gen-sitemap.mjs",
    "scripts/vr-measure-addresses.mjs",
    "scripts/test-dossier-read.mjs",
    "scripts/test-issue-file-doors.mjs",
    // The sitemap's own suite is declared for the same reason the generator is: it
    // held the rule "the file is people, spotlights, bills and the root, nothing
    // else", and this wave advertises a fourth kind. The kind is named there and
    // then examined — bare key, listed once, and either a boundary on file or a
    // measure mapped to it — so the sentence it replaces is stronger than the one
    // it stood in for, not weaker.
    "scripts/test-sitemap-bills.mjs",
  ]);
  let porcelain = "";
  try { porcelain = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }); } catch { /* no git */ }
  const modified = porcelain.split("\n").filter((l) => /^ ?M/.test(l)).map((l) => l.slice(3).trim());
  const stray = modified.filter((f) => !DECLARED.has(f));
  eq(stray.join(", "), "", `F9 modified a file it does not declare (${stray.join(", ")})`);

  // The regenerated sitemap is the seven and only the seven. gen-sitemap.mjs is a
  // whole-document generator, so the way to prove it published this wave's addresses
  // rather than a drifted snapshot of somebody else's is to diff it against HEAD: seven
  // /b/119/H.Amdt. lines gained, all seven this wave's, and no line lost.
  {
    let diff = "";
    try { diff = execFileSync("git", ["diff", "--unified=0", "--", "sitemap.xml"], { cwd: ROOT, encoding: "utf8" }); } catch { /* no git */ }
    const gained = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
    const lost = diff.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
    eq(lost.length, 0, `regenerating the sitemap removed ${lost.length} address(es)`);
    if (f9Unmerged) {
      eq(gained.length, NUMBERS.length, `the sitemap gained ${gained.length} address(es), not this wave's ${NUMBERS.length}`);
      for (const n2 of NUMBERS) {
        const enc = "/b/119/" + n2.replace(/ /g, "%20");
        ok(gained.some((l) => l.includes(enc + "<")), `${n2} did not become an openable address in the sitemap`);
      }
    } else {
      // Merged. The seven are HEAD's addresses now, so they cannot be gained again — but they
      // must still be published, and anything ELSE the regeneration added has to be a person
      // the app's own floor admits rather than a measure this wave never opened. A later wave
      // that admits members can move that number: a record whose cited positions were already
      // on file and whose only missing piece was an identity row clears the floor the moment
      // the row exists, which is the floor working rather than the floor moving.
      const map = R("sitemap.xml");
      for (const n2 of NUMBERS) {
        const enc = "/b/119/" + n2.replace(/ /g, "%20");
        ok(map.includes(enc + "<"), `${n2} is no longer an openable address in the sitemap`);
      }
      const strayGain = gained.filter((l) => /\/b\//.test(l));
      eq(strayGain.join(" | "), "", `${strayGain.length} measure address(es) appeared in a sitemap regeneration that opened no act`);
    }
  }

  // No applied migration was edited BEFORE this wave's: nothing in the directory sorts
  // between F9's file and the ones it was reviewed against. Later waves land after it — a
  // roster wave dated 20261026 is not F9 being overwritten, it is F9 being built on — so
  // what this requires is that MIGRATION is present and that nothing newer than it was
  // inserted UNDER it, which the version-prefix uniqueness check below finishes.
  const sqls = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const at = sqls.indexOf(MIGRATION);
  ok(at !== -1, "this wave's migration is not in the directory at all");
  for (const later of sqls.slice(at + 1)) {
    ok(later.slice(0, 14) > MIGRATION.slice(0, 14),
      `${later} sorts after this wave's migration but does not post-date it`);
  }
  ok(new Set(sqls.map((f) => f.slice(0, 14))).size === sqls.length,
    "two migrations share a version prefix — the apply order between them is undefined");
}

if (failures.length) {
  console.error(`\n  ✗ F9: ${failures.length} failure(s) of ${passed + failures.length} checks\n`);
  for (const f of failures.slice(0, 40)) console.error(`    - ${f}`);
  if (failures.length > 40) console.error(`    … ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`\n  ✓ F9: all ${passed} checks passed`);
console.log(`    contested pool rebuilt at ${decide._counts.contestedPoolRebuilt} (F7 handed on ${decide._counts.f7ClaimedContestedPool}) · ${decide._counts.admitted} admitted · ${decide._counts.refusedInWriting} refused in writing`);
console.log(`    ${decide._counts.measures} amendment measures · ${decide._counts.rollCalls} roll calls · ${decide._counts.issueRows} issue rows on ${decide._counts.keysUsed.length} existing keys · ${decide._counts.memberVoteCells} member votes`);
console.log(`    ${decide._counts.newKeys} new keys · ${decide._counts.parentRollsWritten} parent rolls · ${decide._counts.declinedIssueRows} keys declined in writing · ${decide._counts.dosMechPairs} mechanism pairs · CACHE_VERSION v${MY_VERSION}`);
console.log(`    ${decide.census.poolHandedOn.stillUnreadableUntilAFailedAmendmentTextSourceExists} rolls handed on unreadable: a failed House amendment's text is published nowhere\n`);
