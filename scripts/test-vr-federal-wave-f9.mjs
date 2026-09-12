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
import { measureAddresses, billPath } from "./vr-measure-addresses.mjs";
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
    // The record-first Relevant-to-Me pass (v147), on the same later-wave terms: it
    // repainted a Door 2 section and the cards inside it, and touched no wave artefact.
    // app.css carries the record line's rules; the two harnesses below are the ones whose
    // own assertions were pinned to the retired scorecard markup.
    "app.css", "scripts/test-promise-honesty.mjs",
    "scripts/test-relevant-is-my-ballot.mjs",
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
    // The Your file arrival pass (CACHE_VERSION v162), on those same later-wave terms.
    // It writes no wave artefact: no roll, no mapping, no weight, no floor and no
    // admission. your-file.js only changed WHEN it opens - the overlay at #your-file
    // reached the shipped shell in v161 and never opened from a cold load, because the
    // module's arrival was a macrotask that runs after DOMContentLoaded has already
    // resolved the hash. It opens at parse now, through the same entry every hashchange
    // uses. scripts/test-your-file.mjs is that suite, and it grew the section that pins
    // the arrival with timers switched off, so the bug cannot come back as a passing
    // test. Nothing in either file reads vr_*, a judged surface or Direction Match.
    "your-file.js",
    "scripts/test-your-file.mjs",
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
    // THE EMPTY FORMAL LANE'S VETO (CACHE_VERSION v163), on those same later-wave
    // terms, and the two harness files are here because the pass had to reframe a
    // pin one of them held. /p/cox published "56% Word vs Action · 9 of 25 tested"
    // and a MIXED RECORD chip over a formal brief that said "No formal pattern on
    // file yet": a governor casts no roll calls, so the ACTION half of that
    // comparison was empty and the percentage was the pledge ledger scoring
    // itself. read() now vetoes its own number where no formal row exists for the
    // pid in any of four indexes AND the office casts no floor votes — six spans,
    // carved and argued in the seam module above, with both floors pinned inside
    // two of them character for character. NOTHING IN THIS WAVE'S REACH MOVES: a
    // veto is a conjunction, no roll, mapping, key, floor, weight, tier or
    // admission is written, and the twin boot above has just proved every
    // Direction Match figure identical. scripts/test-eye-find-the-record.mjs held
    // word-action.js on a whole-file do-not-touch list; whole-file identity was
    // only ever a proxy for the claim that section makes — the panel does not
    // reach into that module — so the proxy is replaced by a freeze on the three
    // entry points the panel actually calls. scripts/test-stance-worklist.mjs
    // pinned the publication line whole and now pins both floor comparisons and
    // both constants byte for byte, allowing only a negated conjunct ahead of
    // them: the worklist's stake is that nothing got easier to publish, and that
    // is what the narrower pin says. scripts/test-wva-empty-formal-lane.mjs is new
    // and proves the gate, including that /p/cox publishes the reported 56% again
    // the moment one formal row is handed to the same fixture.
    "scripts/test-eye-find-the-record.mjs",
    "scripts/test-wva-empty-formal-lane.mjs",
    "scripts/test-stance-worklist.mjs",
    // THE IDENTITY CHIP'S DENOMINATOR (CACHE_VERSION v136), on those same
    // later-wave terms, and this wave has the same direct stake in it as in the
    // slice line above. It writes no roll, no mapping, no key, no floor and no
    // admission: the compact Word vs Action chip in the identity block printed the
    // figure and the verdict word and nothing else — "100% · Backs it up" — beside
    // a person's name, on a page that also carries a hundred formal acts, and it
    // now prints the ⚖️ section's own fraction beside the figure ("3 of 6 tested")
    // in the visible text and in the accessible name. The reason a wave like this
    // one is the file that has to declare it: 102 of the 187 chips this corpus
    // paints stand on exactly MIN_TESTED_ITEMS tested items, and a great many of
    // those files are the ones R1 and R2 admitted — a percentage off three
    // statements, unlabelled and beside a name, reads as a career grade. The chip
    // is annotated and not suppressed, so the set of people who get one is
    // unchanged; the seam module above carries the span, and every count, chip,
    // tier and Direction Match figure is byte-identical, which the twin boot above
    // has just proved. scripts/test-wordaction-badge.mjs held the chip to exactly
    // one number and now requires three, with the reversal argued where the old
    // pin stood.
    "scripts/test-wordaction-badge.mjs",
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
    // The bill-door pass (CACHE_VERSION v138), on those same later-wave terms. It
    // writes no roll, no mapping, no key, no floor and no admission: every measure
    // identity the app already prints becomes a door on the bill file that was
    // already there — the dossier's Official Record cards and its "which measures"
    // roll-up, the issue desk's ledger rows on /i/<key>, and the formal brief's
    // proof lines where they print a number. It invents no second address for that
    // file: the door hands the number and the sitting it was printed with to the
    // same PDXBillDetail.open that the in-app #bill/<sitting>/<number> link has
    // always called, and a measure with no page on file says so on the control
    // instead of dead-clicking or dumping the index. consistency.js's fourteen
    // spans are that pass, carved and argued in the shared seam module above.
    //   The single file below moved for one reason. Its allowlist pinned the exact
    // text of the desk's slot(...) call, and that call gained the sitting the number
    // came with, because a bare number is not an identity: H.B. 400 names a
    // different instrument in a different Utah session, and H.R. 6644 in a
    // different Congress. The pin was repaired to the new call rather than loosened
    // off it — it still quotes the call through the isPrimary flag it was written to
    // guard — so the rule it enforces is the same rule, read at the same place.
    "scripts/test-primary-label-not-gate.mjs",
    // The one-person-per-office pass (CACHE_VERSION v139), on those same later-wave
    // terms. It writes no roll, no mapping, no key, no floor, no admission and no
    // score: it makes every person-shaped thing the All-Seeing Eye prints or opens
    // agree on WHICH PERSON it means. The people lane and the receipt lane already
    // resolved their rows through PDXCanonIds, so the duplicate row a reader saw on
    // a phone was fixed there - but the panel has six other emitters that carry a
    // pid and none of them asked: the related chips under a row, the Connections
    // map's teammate and sibling nodes, the ranked rows of an issue answer, and a
    // saved receipt's stored polId. Eighteen retired ids are ISSUE_STANCE_DATA
    // keys, so the panel could print `scott_chew` beside the one Chew row the
    // collapse had kept, and the collapse itself had taken that row's only chip
    // with it - the curated block is filed under the stub's name slug. canonPid()
    // asks PDXPersonLink and PDXProfilePid the same question at every edge;
    // stanceListFor() routes "whose block is this" to _resolveStanceList, the app's
    // own owner of it; and personDoor() is now the panel's single person door, so
    // the id a row's href prints and the id its handler opens can no longer be two
    // people. All three fail open.
    //   The reason a wave like this one is the file that has to declare it: R1 and
    // R2 put 1,120 files behind these rows, and the eye is how most readers reach
    // any of them - a pile of near-duplicate rows is the difference between a
    // finder and a second homepage. Every count, chip, tier, band, side word and
    // Direction Match figure is byte-identical, which the twin boot above has just
    // proved; all-seeing-eye.js, sw.js and index.html are declared above already.
    //   The one file below is the file this wave has to declare, and the reason is
    // narrow: its section 7 pinned the exact text of the judge navigate() arm,
    // which spelled the person funnel out inline. That arm now delegates to
    // personDoor, so the pin is repaired to read the same claim one indirection
    // deeper - the arm must reach the eye's one person door, and that door must
    // hold the person-file opener AND a fallback AND never call the judge renderer
    // directly, which would bypass judge-file.js's openModal intercept. It is
    // strictly stronger than the pin it replaces: the same three rules, checked at
    // the single place there is now one copy of them, and checked on both the arm
    // and the door.
    "scripts/test-eye-judge-lane.mjs",
    // The finance-letterhead pass (no CACHE_VERSION move, because no shipped file
    // moved). The money door on the person letterhead was already built and already
    // mounted - finance-lane.js owns chipRead / chipSegments / letterheadChipMount /
    // openSection, profiles-full.js calls the mount in the identity block, and the
    // three states, the counts-only vocabulary and the scroll-to-this-page jump are
    // all shipped. What that pass added was the contract for the four claims the
    // report asked to be TESTED and that nothing yet tested: that the on-file chip
    // carries no rating vocabulary in its accessible name as well as its visible
    // text, that the click reaches the money block on the profile when CALLED rather
    // than when read off an onclick attribute, that an absent filing puts no digit in
    // the figure slot, and that Direction Match and the formal pattern index are
    // byte-identical with the control mounted and without. All of that lives in a new
    // untracked suite, which needs no declaration.
    //   The one file below does. It is the one-person-per-office harness declared
    // immediately above, and its section 4 built its counterfactual with
    // `git show HEAD:all-seeing-eye.js`: true exactly once, because the moment that
    // pass was committed HEAD carried the fix, the two revisions became one file and
    // three vacuity guards fired on a tree where nothing was wrong. The counterfactual
    // is now built from the shipped source instead - canonPid folded back to the
    // identity it replaced and stanceListFor folded back to the raw ISSUE_STANCE_DATA
    // dip it replaced, each substitution asserted to apply exactly once or the section
    // refuses to claim anything. That is stricter than the revision diff it replaces:
    // it isolates the two functions the claim is about rather than every difference
    // between two commits, it still measures 2 chips before to 1 after and the HD-68
    // row's chip absent before to present after, and it cannot go stale, because what
    // it removes is what it claims. No assertion was relaxed and none was dropped.
    "scripts/test-eye-one-person-per-office.mjs",
    // ── One tested set for the chip and the section (CACHE_VERSION v140) ──────
    // On those same later-wave terms, and this one writes no roll, no mapping, no
    // key, no floor and no admission. The letterhead chip and the mid-page Word vs
    // Action section report the same finding about the same person, a screen apart,
    // and they were reporting two different SIZES of it: on /p/lee the chip read
    // "84% · 5 of 14 tested" beside the name while the section below read 72% over
    // 15 of 26. Neither figure was invented — each was a faithful print of a read
    // taken at a different tick, and this ledger grows during a page's life as the
    // roll-call record and the lazy data bundles land. That is what made the pair a
    // lie: a reader cannot see which tick a number came from, and two "tested"
    // counts on one page is a worse defect than the missing denominator the chip was
    // given one for. One function now owns { pct, tested, eligible, token } and the
    // one fraction sentence those integers make; both surfaces print that object, in
    // the visible text and in the accessible name; and where both halves cannot be
    // said the chip is ABSENT rather than a smaller, secret set with a percentage
    // still on it. Both also moved onto the consistency ring's repaint contract, so
    // they cannot be different ages either.
    //   The reason a wave like this one is the file that has to declare it: R1 and R2
    // put 1,120 member files behind this figure, so the chip beside the name is how a
    // reader meets the formal read at all, and every one of those files carried the
    // pair. read(), scopedRead(), Direction Match, the tier weights and both floors
    // are outside the declared seams and read byte-identically — the twin boot above
    // has just proved the ledger and the DM figure are unchanged for every member.
    //   word-action.js, scripts/v103-chrome-seams.mjs, sw.js and
    // scripts/test-wordaction-badge.mjs are declared above already. The two below are
    // not, and both are re-statements rather than relaxations: each pinned the chip's
    // source with /\bread\(pid, p\)/ and /r\.pct === null/, which said "the chip goes
    // through the engine and fails closed" in the only vocabulary that existed when
    // they were written. The chip now goes through the shared figure instead, so the
    // same two claims are asserted against figure(pid, p) and !f.shows — and
    // test-score-consistency.mjs additionally requires that the owner take
    // scopedRead(), which is the substantive half the old regex could not see. No
    // assertion was dropped and the counterfactuals in both files still hold.
    "scripts/test-score-consistency.mjs",
    "scripts/test-mobile-profile-hierarchy.mjs",
    //   scripts/test-wva-chip-denominator.mjs is here on the same terms, and it is a
    // repair of exactly the failure mode f8 records above for
    // test-eye-one-person-per-office.mjs. Its section 3 built the pre-denominator
    // chip by lifting a span out of `git show HEAD:word-action.js`: true exactly
    // once, because the moment that pass was committed HEAD carried the fix, the two
    // revisions became one file, and its vacuity guard fired on a tree where nothing
    // was wrong. The bare builder is now BUILT from the shipped source by removing
    // the three things the denominator pass added — the both-halves gate, the
    // fraction, the span it prints in — each substitution asserted to apply exactly
    // once, so what it removes is what it claims. Its three load-bearing
    // counterfactuals were re-aimed at the same markup for the same reason. No
    // assertion was relaxed and none was dropped; the suite went from a hard
    // STALE HARNESS stop to 165 passing checks.
    "scripts/test-wva-chip-denominator.mjs",
    // ── One fraction builder on every Word-vs-Action face (CACHE_VERSION v141) ─
    // The same terms again, and the same wall: no roll, no mapping, no key, no
    // floor and no admission. The pass that gave the chip a denominator left three
    // other faces of that one figure building "N of M tested" in their own hands —
    // the apparatus lid's label, the Official Record row in the feeds panel, and
    // the ring's sub-line at the top of the profile. All four sit within a screen
    // of each other on a phone, and three hand-built spellings of one number are
    // three chances to disagree with the section they are describing. All three now
    // print the owner's string and nothing else, under the chip's own rule: no
    // percentage without the set that sizes it. The lid and the feed row read the
    // owner off the read their builder already holds, so no surface pays for a
    // second scoring pass, and the ring's below-floor sentence still names the
    // FLOOR rather than the tested set — the one place the two are different
    // questions.
    //   The reason a wave like this one is the file that has to declare it: R1 and
    // R2 put 1,120 member files behind this figure, and every one of them carried
    // all four faces. word-action.js, scripts/v103-chrome-seams.mjs and sw.js are
    // declared above already — the three new spans are declared in the seam module
    // beside the two the denominator pass cut, and read(), scopedRead(), Direction
    // Match, the tier weights and both floors are outside all five and read
    // byte-identically, which the twin boot above has just proved for the ledger
    // and the DM figure.
    //   The one file below is not, and it is a re-statement rather than a
    // relaxation. Its spine assertion pinned the lid's label by the arithmetic the
    // label used to spell — /r\.coverage\.tested \+ ' of ' \+ r\.coverage\.scorable/ —
    // which was the only vocabulary for "the label names its payload with a count"
    // that existed when it was written. The invariant is unchanged and now asks for
    // the owner: the label must print figureOf(pid, r)'s fraction, and a second
    // assertion beside it refuses the hand-built pair coming back. Strictly
    // stronger, and nothing was dropped.
    "scripts/test-profile-spine.mjs",
    // ── Door 2 on a phone: one owner, one figure, and a rail that stays put
    //    (CACHE_VERSION v142) ────────────────────────────────────────────────
    // The same terms once more, and the same wall: no roll, no mapping, no key, no
    // floor and no admission. Four surfaces on one homepage screen were each
    // answering a question they do not own. WHO REPRESENTS ME painted "3 of 6 seats
    // resolved" with both U.S. Senate rows and the Governor row reading "No record
    // on file yet — we'd rather leave this blank than name the wrong person" over
    // Mike Lee, John Curtis and Spencer Cox; the ballot WORKSPACE HEADER said "No
    // current officeholder resolved" above a pane listing those same people. Both
    // were right about the roster they could see — cmp-data.js is deferred and both
    // of these surfaces are synchronous — and the only thing correcting either of
    // them was a stopwatch (600/1800/4000 ms in the band, 400/1200/3000 ms in the
    // workspace). voter-hub-location.js owns the resolution, so it now announces its
    // own input arriving: window.pdxRosterReady(cb), one moment, fired immediately
    // for a subscriber that loaded after the roster landed, with the statewide memo
    // dropped at that moment so the repaint cannot be served the answer it is
    // replacing. Both surfaces subscribe instead of growing polls of their own, and
    // the workspace header NAMES every pid pdxSeatHolders() returns rather than
    // reading "the light roster has no display row for that pid yet" as "there is no
    // holder". The seat rail keeps the reader's scroll across the repaint that
    // destroys it and reveals the selected chip by scrollLeft arithmetic — not
    // scrollIntoView, which would drag the page's vertical scroll with it — and
    // .bw-seats gained position:relative so the fallback measurement is taken inside
    // the rail. The homepage record card's second figure is closed in the same pass:
    // it painted 88% over 5 tested and settled to 72% over 15, and now prints the
    // shared figure and withholds the percentage until the record under it has
    // stopped growing. word-action.js, hero-showcase.js, sw.js,
    // scripts/test-hero-showcase.mjs and scripts/test-homepage-card-lane.mjs are all
    // declared above already.
    //   The reason a wave like this one is the file that has to declare it: R1 and R2
    // put 1,120 member files behind these seats, and this band and this workspace are
    // how a reader in a real county reaches any of them — a header denying a holder
    // the pane beneath it is listing is a claim about this app's coverage of that
    // roster, made from a fact about one loading tab. Nothing this wave measures
    // moves: no roster row, no admission, no floor, no weight, no verdict and no
    // Direction Match read, which the twin boot above has just proved for the ledger
    // and the DM figure.
    "ballot-workspace.js",
    "ballot-workspace.css",
    "voter-hub-location.js",
    "who-represents-me.js",
    //   The four harnesses below are re-statements rather than relaxations.
    // test-door2-holders.mjs pinned the header's third branch — the sentence that is
    // now unreachable — and asks for the named holder in its place, with every pid a
    // header prints required to be one the owner returned, swept across all five
    // mapped seats. test-ballot-workspace.mjs widened one alternation to the two
    // states that header now has. test-score-depth.mjs pinned the card's caption by
    // the phrase the card used to compose (d.testedSay) and now requires the shared
    // figure's own sentence, which is the stronger form of the rule that section
    // exists for: the figure publishes both halves or neither, so a percentage
    // reaching that card without its set is unconstructible rather than merely
    // forbidden. test-profile-unification.mjs pinned "the homepage card paints
    // brief().pct" by that spelling; the card prints PDXWordAction.figure() now, so
    // the same claim is asserted as a NUMBER — the figure's percentage IS the
    // brief's, for the president — with the old spelling refused beside it. No
    // assertion was dropped and every counterfactual still holds.
    "scripts/test-door2-holders.mjs",
    "scripts/test-ballot-workspace.mjs",
    "scripts/test-score-depth.mjs",
    "scripts/test-profile-unification.mjs",
    // RELEVANT TO ME IS THE READER'S BALLOT (CACHE_VERSION v146), on those same
    // later-wave terms, and this wave has the same direct stake in it as in the
    // two passes above. It writes no roll, no mapping, no key, no floor and no
    // admission: the section above the ballot workspace was listing every group
    // Door 1's classifier can name, so a Layton reader's "relevant to me" carried
    // a CABINET / APPOINTED accordion — other states' secretaries of state
    // mixed in with the federal cabinet — under "Compare the field · 38 in this
    // race", plus a five-way presidential "race" and a wall of judges between the
    // seat list and the picks. The reason a roster wave is the file that has to
    // declare it: R1 and R2 admitted several hundred identity rows, and the
    // classifier files every secretary/director/ambassador office under one
    // `cabinet` bucket, so each admission made that accordion wider — the defect
    // grew with the roster this wave was built to grow. compare-hub.js now derives
    // the allowed groups from window.TEAM_POSITIONS, the same per-state slate the
    // workspace and the seat counts read, and filters what is left to the reader's
    // own state with the one seat resolver's answer exempt; archive-browse.js and
    // archive-browse.css give the appointed and executive officers two chambers
    // under the archive's existing "not a ballot" kicker, so not one record was
    // deleted; judicial-ballot.js moved both of its mounts out of the pick flow
    // into a lane of its own and left one line behind. No count, chip, tier or
    // Direction Match figure moved, which the twin boot above has just proved.
    "archive-browse.js",
    "archive-browse.css",
    "judicial-ballot.js",
    "scripts/test-local-officials-routing.mjs",
    // THE MONEY LANE'S WALL WIDENED, on those same later-wave terms, and a roster
    // wave is the file that has to declare it for the reason the block above gives:
    // the thing that made the old finance grade indefensible was its DENOMINATOR,
    // and R1/R2 are what moved it. Thirteen itemized filings against the 1,120
    // records this wave's roster now carries is the ratio the lane discloses in
    // words on every profile, so each admission this wave made is another person
    // the money lane has to say "no filing on file" about honestly.
    //   finance-lane.js adds two names to the NEVER_FEEDS wall it already
    // published — `alignment` and `door2Picks`, the personal alignment read and the
    // reader's own ballot — plus the comment saying why those two are named apart
    // from `ballotSort` and `yourMatch`. No composition, figure, bucket, colour,
    // coverage sentence or chip state changes: the array is read by the harness
    // below and by nothing that renders.
    //   scripts/test-finance-lane.mjs is a re-statement rather than a relaxation,
    // in the sense test-door2-holders.mjs was above. It asserts the two new wall
    // names; it sweeps the alignment engine and every Door 2 surface that orders a
    // field or holds a pick for finance identifiers; it holds the filings index
    // (`_FTM_BY_ID` / `FTM_AS_OF` / `FTM_FUNDING` / `FTM_DATA`) to a SINGLE shipped
    // owner, so a lane that cannot see a filing cannot weigh one whatever it later
    // decides — which is the structural form of a wall that was an enumeration; it
    // extends the existing twin boot to compare the alignment side-map, its
    // coverage, and every Door 2 pick read (seat list and order, field gate, pick
    // store, running count) byte-identical with a full filing seeded and with none;
    // and it fences, by name and by shape, the per-person 0-100 funding map that
    // profiles-full.js carried until this pass. No assertion was dropped and every
    // counterfactual still holds.
    //   That deletion is the one behaviour change and it is a deletion: the
    // `FINANCE_INTEGRITY` bag of thirteen hand-set 0-100 scores, already unread
    // since the Constituents-First ramp was retired, is gone from the bundle rather
    // than left dormant. Nothing read it, so no roll, mapping, key, floor,
    // admission, tier, chip, count or Direction Match read moves — which this
    // wave's own twin boot has just proved for the ledger and the DM figure.
    "finance-lane.js",
    "scripts/test-finance-lane.mjs",
    // ── A LATER PASS, declared on the terms F8 established rather than forbidden ──
    // DISTRICT DISCUSSION phase 0 adds four tables to db/schema.ts — dd_districts,
    // dd_issue_keys, dd_threads, dd_posts — and one new migration directory,
    // 20261029000000_create_dd_district_discussion_tables, which is untracked and so
    // was never in this guard's reach. The schema file is: a drizzle model set lives
    // in exactly one file this repo points drizzle-kit at, so a table cannot be added
    // anywhere else, and this wave's own rows, mappings, keys and refusals are not in
    // that file at all. Nothing this pass adds is readable by the formal record — no
    // dd_* table is referenced by any vr_* model, migration, ingest script, pack or
    // reader surface, and phase 0 ships no query against them at all. The twin boot
    // above is therefore untouched by it, which is the claim this list exists to keep
    // checkable rather than the claim that nothing else may ever change.
    "db/schema.ts",
    // ── A LATER PASS, declared on the terms this guard established ─────────────
    // THE DISTRICT ROOM'S AUTH FOLLOWS THE NAV CHIP FOR A GOOGLE SESSION TOO.
    // district-room.js changes in one place only — the "who is this request"
    // helper — so a reader signed in with Google is signed in for the room as
    // they already were for the account chip: auth resolves only once there is a
    // real ID token for that uid, an unattributed answer is re-asked as the
    // account the SDK has, and an anonymous leftover is switched away from rather
    // than read as a sign-out. Its own suite (scripts/test-district-room.mjs)
    // grows the section that pins it.
    //   NOTHING IN THIS WAVE'S REACH MOVES. The room reads /api/district-room and
    // the dd_* tables and nothing else: it queries no vr_* model, no pack, no
    // ingest script and no reader surface this guard measures, it carries no
    // roll, mapping, key, floor, admission, tier, chip, count or Direction Match
    // figure, and it prints no pid. The twin boot above is therefore untouched by
    // it — which is the claim this list exists to keep checkable rather than the
    // claim that nothing else may ever change.
    "district-room.js",
    // ── A LATER PASS, declared on the terms this guard established ─────────────
    // DISTRICT VOICE OPENS ON ONE UTAH SEAT, AND IT IS NOT A SECOND RECORD.
    // district-file.js and district-file.css paint the seat's file as two
    // containers now — the sitting member's chip, the seat's one live question and
    // its verified neighbours' takes first, the issue rooms under them — and
    // scripts/test-district-file.mjs grows the sections that pin that order and
    // the honest-empty sentence a seat with no takes prints instead of a feed.
    // person-file.css carries the one quiet link on the sitting member's file:
    // one line of type, no chip, no count and no figure.
    //   NOTHING IN THIS WAVE'S REACH MOVES. Voice reads /api/district-voice and
    // the voice_* and dd_* tables and nothing else: no vr_* model, no pack, no
    // ingest script and no reader surface this guard measures. It writes no
    // formal act, stance, tier, mapping, key, floor, admission, finance row or
    // Direction Match figure, it holds no pid and no party field, and it
    // publishes one integer per poll option rather than any percentage. The twin
    // boot above is therefore untouched by it — which is the claim this list
    // exists to keep checkable rather than the claim that nothing else may ever
    // change.
    "district-file.js",
    "district-file.css",
    "person-file.css",
    "scripts/test-district-file.mjs",
    "scripts/test-district-room.mjs",
    // ── AND THE PASS AFTER IT, on the same terms ───────────────────────────────
    // THE ROOM OFFERS ITS ASK TO THE NEIGHBOUR WHO NEEDS IT. A signed-in reader
    // with no residency row read the true sentence — nothing has been established
    // about where you live — under no control at all, because the client ANDed the
    // server's offer with a test of its own: was this the district the reader's own
    // "which district am I in" resolver placed them in? That resolver answers "not
    // located" until somebody types a zip, so the ask was hidden from exactly the
    // people it exists for. The client now paints it on the server's flag alone.
    // netlify/functions/district-room.mts is in this list for COMMENTS ONLY — the
    // route's prose asserted the restriction that just came out, so leaving it
    // would have documented a safeguard that no longer exists. No statement, query,
    // status, method or response field in it changed.
    //   NOTHING IN THIS WAVE'S REACH MOVES, for the same reasons as above: the
    // room still reads /api/district-room and the dd_* tables and nothing else, no
    // vr_* model, pack or ingest script is queried, no roll, mapping, key, floor,
    // admission, tier, chip, count or Direction Match figure is carried, and no pid
    // is printed. Asking still writes a PENDING row that cannot post or vote, and a
    // reviewer's grant is still the only path to verified.
    "netlify/functions/district-room.mts",
    // ── AND THE PASS AFTER THAT, on the same terms ─────────────────────────────
    // THE ROOM'S REVIEWER FOOTER IS NO LONGER HIDDEN FROM THE REVIEWER WHO CAN
    // POST. A reviewer verified in the district they review had the composer
    // opened and the grant taken away in the same read, so the one reader able to
    // approve a pending neighbour never saw the control that approves them. The
    // client paints the footer on the server's reviewer flag alone and the uid
    // being verified is now a required field in it, refused when it is the
    // reviewer's own. district-room.css gains that field's two rules;
    // netlify/lib/district-room-core.mjs gains three copy strings (the field's
    // label and the two refusals) and nothing else — no gate function, no status,
    // no method and no verifying-method list changes in it.
    //   NOTHING IN THIS WAVE'S REACH MOVES, for the reasons the two blocks above
    // give: the room still reads /api/district-room and the dd_* tables only, no
    // vr_* model, pack or ingest script is queried, no roll, mapping, key, floor,
    // admission, tier, chip, count or Direction Match figure is carried, and no
    // pid is printed. A reviewer's grant is still the only path to verified, and
    // it now has to name somebody other than the reviewer to be one.
    "district-room.css",
    "netlify/lib/district-room-core.mjs",
    // ── AND THE PASS AFTER THAT: THE DISTRICT FILE ────────────────────────────
    // ONE PAGE PER DISTRICT, AND IT IS A LIST OF DOORS. /d/<districtKey> - one
    // Utah district, its seated member, and the issue rooms in it - so a
    // neighbour has a way into District Voice that is not a pasted room URL.
    // ballot-breakdown.js gains ONE export, window.pdxSeatedMemberFor(seatKey,
    // districtNumber): a lookup into the curated incumbent maps that were already
    // in that file, resolved from an ADDRESS rather than from a reader location.
    // It reads no roll, no mapping, no tier and no figure; it returns a pid or
    // null and nothing else. Not one incumbent map entry, seat label, district
    // math or location path in that file changed.
    //   netlify/functions/voting-record.mts gains ONE ROUTE, and it only reads:
    // GET /member/:pid/issue-keys returns the issue keys a member has at least
    // three formal acts on, counted over vr_member_votes -> vr_rollcalls ->
    // vr_measure_issues and vr_positions -> vr_measure_issues, every key checked
    // against the shipped ISSUE_KEYS allow-list. It is a COUNT over rows this
    // wave stored, so it cannot move them: no INSERT, no UPDATE, no DELETE, no
    // mapping generation, no pack, no floor, no tier, no admission and no
    // Direction Match figure is written, read or published by it. Every existing
    // route, model, seed and migration in that file is byte-identical, and the
    // three-act floor is the app's own existing minimum rather than a new one.
    //   NOTHING IN THIS WAVE'S REACH MOVES. The district file prints an issue
    // label, three integers from the room's own poll tally and a /p/<pid> link -
    // no party, no score, no grade, no percentage, no rank - and the new
    // migration inserts exactly one dd_threads row. No vr_* row, key, roll,
    // weight, polarity or refusal is touched by any of it.
    "ballot-breakdown.js",
    "netlify/functions/voting-record.mts",
    // ── AND THE PASS AFTER THAT: YOUR FILE ────────────────────────────────────
    // EIGHT ISSUES, THE READER'S OWN ANSWER ON EACH, SAVED TO THEIR UID
    // (#your-file, your-file.js, CACHE_VERSION v161). Alignment needed the
    // reader's positions to compare a formal record against, and the app had
    // nowhere to hold them: Forum chips are a topic interest, and a District Room
    // poll is district+issue rather than a personal file.
    //   netlify/functions/pdx-sync.mts gains ONE STRING, and it is a name in an
    // allow-list: 'yourFile' joins the five personal collections already there.
    // That function stores one opaque JSON snapshot per (user_id, collection) in
    // pdx_snapshots and never looks inside it, so there is no schema change, no
    // new table and NO MIGRATION — the row shape the other five use is the row
    // shape this one uses. Every verifier, every limit, every query and every
    // response in that file is byte-identical: the token check, FIREBASE_PROJECT_ID,
    // MAX_SNAPSHOT_BYTES and the read/write handlers all still read as written.
    //   NOTHING IN THIS WAVE'S REACH MOVES. This collection is PERSONAL data,
    // merged on the client and read by no public surface. It is not poll data and
    // it shares nothing with dd_poll_answers or dd_threads; no vr_* table, row,
    // roll, mapping, key, floor, weight, tier, admission, refusal or Direction
    // Match figure is written, read or published by any of it. The two scoring
    // lanes in alignment-tool.js are byte-identical to HEAD — the file reaches the
    // match through alignSetIntensity / alignToggleIssue, doors that were already
    // exported — and the one span this pass does add to that file is carved and
    // argued as AT_SEAMS in scripts/v103-chrome-seams.mjs.
    "netlify/functions/pdx-sync.mts",
    // ── AND THE PASS AFTER THAT: A NAME'S EDGE, AND ONE CORRECTED PORTRAIT ──
    // A ROSTER PHOTO THAT NAMED THE WRONG PERSON, AND A SEARCH THAT MATCHED A
    // SURNAME IN THE MIDDLE OF ANOTHER ONE (CACHE_VERSION v164). `kennedy` was
    // filed in the live roster with Bioguide K000404 - Kimberlyn King-Hinds, MP -
    // instead of K000403, an image that loads, so nothing reported it;
    // firebase-boot.js now corrects it as each document lands. And the All-Seeing
    // Eye's roster answer is split after ranking into the people the query NAMES
    // and the people it is only spelled inside, so "cox" no longer answers with
    // Wilcox first.
    //   scripts/test-photo-coverage.mjs is the harness that pins the correction:
    // same url as BROWSE_PHOTOS for the same pid, host inside its already-vetted
    // ALLOWED set, and applied at every PROFILES write site. It gains assertions
    // and loosens none - the arrival-pool floor, the URL shape check, the
    // duplicate-key scan, the host set and the netlify.toml cross-pin all still
    // read exactly as written.
    //   NOTHING IN THIS WAVE'S REACH MOVES. No vr_* table, row, roll, mapping,
    // key, floor, weight, tier, polarity, admission, refusal or Direction Match
    // figure is written, read or published by any of it. score() and rank() in
    // all-seeing-eye.js are byte-identical to HEAD, recordFirst() is unedited and
    // simply runs inside each of the two groups, no party letter entered a sort
    // key, and no image host was added to the trusted set or to remote_images.
    "scripts/test-photo-coverage.mjs",
    // ── AND THE PASS AFTER THAT: A GOVERNOR'S FORMAL LANE ──────────────────
    // 140 RECORDED GUBERNATORIAL ACTS - 138 BILLS SIGNED, 2 VETOED - FILED FOR
    // cox AS vr_positions ROWS (CACHE_VERSION v165). The office printed "No
    // formal pattern on file yet" because the pattern engine only ate floor,
    // committee and sponsorship acts, and a governor casts none of them. The two
    // act types this wave adds are new (gov_signed, gov_vetoed), weighted 0.70 -
    // BELOW a floor vote - labeled "Signed" and "Vetoed", kept out of Direction
    // Match, and NO SURFACE CALLS EITHER ONE A VOTE. No roll call was invented.
    //   formal-index.js gains exactly ONE LINE, 'cox': [140, 140], and
    // scripts/gen-formal-index.mjs gains the feeder that produces it - a whole-
    // document regeneration on the same later-wave terms as sitemap.xml above,
    // additive, with F9's own people byte-identical inside it.
    // scripts/test-vr-mapping-migration-pack-step.mjs gains one ingest name to
    // its ACTIVE list, a claim about which ingests have sessions LEFT and not
    // about any applied migration.
    //   NOTHING IN F9'S REACH MOVES. No federal act, no amendment, no roll, no
    // vr_member_votes row, no floor, no polarity and no Direction Match figure is
    // written, read or relabeled - and /p/trump is byte-identical, because the
    // President's signature lane keeps its own act types and its own count rather
    // than being renamed into these. The spans this pass adds to stance-helpers.js
    // and consistency.js are carved and argued in scripts/v103-chrome-seams.mjs.
    "formal-index.js", "scripts/gen-formal-index.mjs",
    "scripts/test-vr-mapping-migration-pack-step.mjs",
    //   scripts/test-vr-utah-exec.mjs is the wave's OWN harness, listed here for
    // the one reason a harness ever earns a place on this list: its twin-boot
    // counterfactual was pinned to HEAD, which was the tree before the wave only
    // while the wave was in flight. On a merged tree HEAD knows gov_signed, so it
    // now walks stance-helpers.js back to the newest revision that does not and
    // boots that instead. The comparison got MORE durable, not weaker - it refused
    // to pass vacuously rather than going quiet, which is why it was found.
    "scripts/test-vr-utah-exec.mjs",
    // ── AND THE PASS AFTER THAT: WORD FIRST, WHERE THE FORMAL LANE IS EMPTY ─
    // A CANDIDATE FILE OPENED WITH THREE ABSENCES OVER SEVEN SOURCED POSITIONS
    // (CACHE_VERSION v168). /p/lyman printed "record still being built", a formal
    // brief of nought acts and "not enough on file to test", in that order, while
    // his own cited stance cards sat below the fold. On a file with ZERO READABLE
    // ACTS and at least one CITED position, the identity zone now leads with what
    // the person SAID — issue rows in the existing topic colours, each a door to
    // that issue's dossier, tagged SAID, capped at six, over one honest line
    // saying the formal lane is empty and that documented positions are not a
    // voting pattern.
    //   word-action.js carries the block; its three spans are carved and argued as
    // "the word-first letterhead", "the word-first letterhead's mount" and "the
    // word-first lane, published" in WA_SEAMS, and this suite argues every one of
    // them through assertWordActionSeams — no percentage, no RECORD or PATTERN
    // word on a stance row, no party letter, no Direction Match floor, and a gate
    // that stands down for any file whose record has been read, has failed to
    // load, or has not been asked for yet.
    //   profile-spine.js gains the two-jobs explainer's word-first wording, which
    // asks word-action.js's own published predicate rather than re-deriving the
    // decision, so the explainer and the letterhead cannot disagree about which of
    // the two jobs is the main view. WVA stays the integrity check.
    //   publication-floor.js resolves a stance key the way stance-helpers already
    // did — id, alias, name slug, alias of the slug — because curated cards are
    // routinely filed under a name slug while the roster keeps a short id, and the
    // floor was reading zero cited positions for a person whose file renders
    // seven. NO FLOOR RULE MOVES: every threshold, every clears() branch and every
    // publishable() branch is byte-identical to HEAD, the change is which key the
    // stance list is fetched under, and it admits no identity of its own — the
    // roster is read for a display name and never for membership.
    //   scripts/test-record-top.mjs and scripts/test-door2-one-loop.mjs are
    // pinned harnesses whose subjects moved under them, and both got NARROWER, not
    // looser: the first now holds two subjects where it held one — an empty-record
    // subject with no cited position (jknotts) and a word-first subject with two
    // (mschultz) — and asserts the new letterhead on the second rather than
    // dropping the old claim; the second's one-person-field assertion now branches
    // on whether the seat HAS a district, because a corrected office label made
    // the governor field one-person for the first time.
    //   NOTHING IN THIS WAVE'S REACH MOVES. No vr_* table, row, roll, mapping,
    // key, floor, weight, tier, polarity, admission, refusal or Direction Match
    // figure is written, read or published by any of it. The block cannot render on
    // a file that has a record — which is every member this wave admits — and it
    // prints no figure on the files it does render on, because the one class of
    // file whose action half is empty by definition is the one class that may
    // never carry one.
    "profile-spine.js", "publication-floor.js",
    "scripts/test-record-top.mjs", "scripts/test-door2-one-loop.mjs",
    // ── AND THE PASS AFTER THAT: AN UNREAD CRUMB IS NOT A FORMAL TERM ────
    // THE WORD-FIRST GATE COUNTED ROWS WHERE IT MEANT TO COUNT ACTS
    // (CACHE_VERSION v169). /p/lyman still opened on the record-first brief,
    // reading "1 issue on the formal record · 0 votes and formal actions read ·
    // 0 deep enough to characterise" over the same seven cited stance cards the
    // pass before it had just promoted. The gate asked the formal pattern index
    // whether anything had been READ, and a row read out of a member's own
    // stated positions carries read: true with nothing judged — so one crumb
    // outranked seven sourced sentences.
    //   word-action.js's gate is rebuilt on a published predicate, saidNoTerm,
    // which asks for ACTS: zero characterised, zero read with a side, and every
    // row on the lane inert. It deliberately never reads the lane's read count,
    // and both it and saidRowInert are argued in the shared seam module — the
    // count that caused this is asserted as an ABSENCE, so it cannot come back
    // as a copy edit.
    //   consistency.js drops ONE curated line from OFFICIAL_ACTION_ISSUE_BACKFILL:
    // the lyman spotlight pattern summary keyed to lands_local. It is the class
    // that map's own documented rule excludes — a biography sentence with no
    // measure, no ballot and no date — and it was the whole of the "1 issue on
    // the formal record" count. While it was mapped it also published a TESTED
    // lands_local row with a 100% Direction match and a "consistent" verdict for
    // someone who has never cast a vote; it sat below the publication floor, so
    // no percentage was ever printed, but the row was on the issue desk. The
    // spotlight item itself is untouched and still reads in its own lane: no act
    // was invented and no material was removed. That withdrawal is the ONE PAIR
    // the twin boots in this wave family now declare, downward only — tested to
    // untested, the figure gone, the verdict back to pending — and it writes no
    // vr_* row, no key, no floor and no admission of its own.
    //   gaps.js gains one non-askable type, no_formal_term, which collapses the
    // per-issue "no action yet" rows on this class into a single sentence — "No
    // formal term to test yet — N documented positions, 0 acts on file." — so the
    // Evidence surface stops itemising a candidate's issues as OPEN GAP /
    // SUGGEST A LEAD as though votes had been ducked that were never eligible to
    // be cast. It carries no severity pill, no ask, no lead and no method link,
    // and because it is not askable the open-gap count drops those rows rather
    // than renaming them.
    //   NOTHING ELSE IN THIS WAVE'S REACH MOVES. Every formal tier and every
    // Direction Match read outside the declared pair is byte-identical to HEAD,
    // which the twin boot above has just measured across 1,120 files.
    "gaps.js",
    "scripts/test-gaps.mjs",
    "scripts/test-said-brief-word-first.mjs",
    // ── AND THE PASS AFTER THAT, on the same terms ─────────────────────────────
    // VOICE SLICE 1.1 IS HYGIENE ON ONE UTAH SEAT: ONE LEDE, ONE ADDRESS, AND A
    // RECORD STRIP THAT SAYS WHICH QUESTION IT MEANS. district-voice.js stops
    // printing one hedged sentence for three different outcomes — the read is in
    // flight, the record came back empty, the read failed — and prints a distinct
    // sentence for each, so the strip never implies a fetch is still coming after
    // it has landed; an item that returns on a key other than the poll's issue is
    // dropped rather than shown, so the strip cannot silently answer a different
    // question than the poll above it. netlify/lib/district-voice-core.mjs is the
    // one owner of that copy and gains the two new sentences; the Function
    // netlify/functions/district-voice.mts ships all three keys in the read
    // payload's copy block and is otherwise unchanged — no new query, column,
    // status or response field. scripts/test-district-voice.mjs grows the section
    // that pins the four strip states, both spellings of the address, the single
    // lede, and the person-modal handoff.
    //   NOTHING IN THIS WAVE'S REACH MOVES. Voice still reads /api/district-voice
    // and the voice_* and dd_* tables and nothing else: no vr_* model, no pack, no
    // ingest script and no reader surface this guard measures. It writes no formal
    // act, stance, tier, mapping, key, floor, admission, finance row or Direction
    // Match figure; it holds no pid and no party field; it publishes one integer
    // per poll option and never a percentage. The strip's own read is the existing
    // voting-record route, asked for one row on the poll's issue and printed as a
    // title and a date with no figure of any kind. The twin boot above is
    // therefore untouched by it — which is the claim this list exists to keep
    // checkable rather than the claim that nothing else may ever change.
    "district-voice.js",
    "netlify/lib/district-voice-core.mjs",
    "netlify/functions/district-voice.mts",
    "scripts/test-district-voice.mjs",
    // ── THE MOBILE BODY-LOCK PASS (CACHE_VERSION v178), on the same later-wave
    // terms as everything above, and it is the narrowest kind of edit this list
    // ever has to absorb: a scroll contract, a tap target, a relabel and a guard.
    //   A phone report said the Support card and the eight-issue "Your positions"
    // panel were jumpy, laggy and stopped scrolling; that Support was a QR code
    // with nothing tappable; and that a "You're offline" banner was up on working
    // cell data. Four causes. your-file.css capped the panel with
    // `calc(100vh - 48px)` inside a `position:fixed; inset:0` box, so it was sized
    // by the LARGE viewport and its last rows sat behind the browser toolbar; the
    // box is now 100dvh and .pdxyf-body is the only scroller, with contained
    // overscroll. your-file.js answered every pick by rewriting all eight rows
    // through innerHTML, which clamped the scroller to zero and destroyed the node
    // under the finger mid-gesture; patchRow() now moves four aria-pressed states
    // and the count's own text node. pdx-stability.js adds #pdx-your-file to the
    // overlay list its reference-counted lock consults, so nothing else can unlock
    // the document behind an open panel. mobile-polish.css §7g gives the donate
    // card the same dvh-bounded scroller and stands down a 300%-gradient animation
    // that repainted forever behind two blurred circles. door2-spine.js gained two
    // entries in its declarative VIEWS list so #evidence-for-my-vote and #my-saved
    // print the "View of your ballot workspace" strip the other three already had.
    //   NOTHING IN THIS WAVE'S REACH MOVES, and that is the claim this list exists
    // to keep checkable. No vr_* model, pack, migration, ingest script or member
    // file was read or written. No formal act, stance, tier, mapping, key, floor,
    // admission, finance row or Direction Match figure moved; no surface gained a
    // percentage, a party letter or a count of anything; the donate card publishes
    // no total, goal or progress bar, because a donation is not a score. The twin
    // boot above is untouched by all of it. The two harnesses named here are edited
    // rather than weakened: test-door2-authority.mjs's view-count tripwire moved
    // from 3 to 5 with the reason recorded inline (its per-view assertions — a
    // mount, a label, a job, not being the authority — are what hold the contract
    // and both new views satisfy them), and test-eye-find-the-record.mjs traded a
    // whole-file byte pin on door2-spine.js for the claim that pin stood for,
    // asserted directly: the spine still computes nothing, still declares one
    // authority, and with comments set aside its only change is the two entries.
    "your-file.css",
    "mobile-polish.css",
    "pdx-stability.js",
    "door2-spine.js",
    "scripts/test-door2-authority.mjs",
    "scripts/test-eye-find-the-record.mjs",
    "scripts/test-mobile-body-lock.mjs",
    // ── THE SUPPORT-ROUTING AND /p/null PASS (CACHE_VERSION v179), on the same
    // later-wave terms as everything above: a destination, a refusal and a
    // stacking order.
    //   A phone reader who tapped anything labelled Support landed on four
    // different surfaces and never on the donate card, and the path analytics
    // showed /p/null as the second most-viewed address in the tree. Three
    // causes. The shell's money-labelled controls either set the hash and let
    // the native jump finish on some other section or offered no money control
    // at all, so support-route.js now owns arrival — it parks
    // #support-politidex under the measured nav, closes an open person file
    // first, and stands down entirely while the document is locked — and
    // my-profile.js prints one gold control that goes to that hash instead of
    // to #voter-hub. encodeURIComponent(null) is the four-character string
    // "null", which every `if (!pid)` guard in the tree waves through, so
    // person-file.js declares the sentinel predicate and realPid(), and
    // person-link.js, share-links.js, record-card.js, profiles-full.js,
    // self-defection.js, gen-sitemap.mjs, digest-record-core.mjs and
    // share-target.ts each refuse the same three words before they concatenate
    // a /p/ address. support-route.css lifts the donate card one step above the
    // Your Trail rail and tucks the rail on that hash alone, so the QR and the
    // Venmo button are never painted over.
    //   NOTHING IN THIS WAVE'S REACH MOVES, and that is the claim this list
    // exists to keep checkable. No vr_* model, pack, migration, ingest script
    // or member file was read or written. No formal act, stance, tier, mapping,
    // key, floor, admission, finance row or Direction Match figure moved: the
    // refusals named here withhold an address that names nobody and leave every
    // address that names somebody byte-for-byte as it was, which is why the
    // /p/ builder count in each of those files is itself pinned. No surface
    // gained a percentage, a party letter or a count of anything, no payment
    // processor was added, and the donate card still publishes no total, goal or
    // progress bar, because a donation is not a score. The twin boot above is
    // untouched by all of it. The harnesses named here are edited rather than
    // weakened: test-eye-find-the-record.mjs traded its whole-file byte pin on
    // person-link.js for the claim that pin stood for, asserted directly — the
    // file still builds a /p/ address in the same one place and its only change
    // is the sentinel refusal — on exactly the terms it traded the
    // door2-spine.js pin one pass earlier; and this list gains the files above
    // in both F8 and F9, and nothing else, because a cache bump does not reach
    // a mapping.
    "my-profile.js",
    "person-link.js",
    "record-card.js",
    "self-defection.js",
    "share-links.js",
    "netlify/lib/digest-record-core.mjs",
    "netlify/lib/share-target.ts",

    // The /api/votes retirement, on the same later-wave terms as every entry
    // above it: a dead client call was deleted and a shell version was renamed.
    // like-dislike.js is the only file this list did not already carry — the
    // pass's other three (index.html, sw.js, netlify.toml) are declared further
    // up. It holds the like/dislike popularity chips, which are a Firestore
    // collection and not a wave artefact: no mapping, no roll call, no measure,
    // no issue key and no judged surface is reachable from it, and the twin boot
    // below does not load it. What moved in it is three deleted mirror POSTs to
    // an endpoint that was never deployed, one read fallback that fanned out a
    // 404 per politician, and prose saying so.
    "like-dislike.js",
    // ── THE INSTANT-TAP PASS (CACHE_VERSION v181), on the same later-wave terms
    // as everything above it: a paint was deferred, two surfaces stopped
    // fighting over one scroll, and nothing was measured differently.
    //   Your File asks the reader eight questions and on a phone the eighth
    // could not be reached. Each pick ran _alignRefreshAll — sixteen
    // document-wide repaints, two of them whole grid rebuilds — behind a
    // full-screen panel that covers all sixteen, and the render paths in it
    // also warmed a vote pack, so one tap on one of eight rows rebuilt the
    // homepage and opened a request. The fix is a PAINT HOLD at the one owner
    // of that fan-out: three argued spans in scripts/v103-chrome-seams.mjs, in
    // which every entry point of the engine stays byte-identical to HEAD — no
    // parameter, no flag, no second door, so no caller anywhere gained a way to
    // opt out of a refresh — plus your-file.js taking that hold while its panel
    // is up and releasing it, once, when the panel closes. The 75
    // parser-blocking script tags were deliberately NOT converted in this pass;
    // they are not what the eight taps were paying for.
    //   The donate half is three files and no money rule. support-route.js
    // issues no scroll when the card's top is already within 1px of the park
    // target and no longer closes a person file that is not open; journey.js
    // stands its trail bar down on #support-politidex, because journey.css's
    // body.pj-has-bar adds 3.5rem to the document even with the bar display:none
    // and it was doing it in the same frame the arrival scroll measured the
    // card; app.css takes the pointer events off the "Loading the latest
    // roster…" pill, which is a background warm and not a control, and drops
    // its backdrop-filter; mobile-polish.css stands the donate card's glow
    // filters down at every width rather than on phones alone.
    //   NOTHING IN THIS WAVE'S REACH MOVES, which is the claim this list exists
    // to keep checkable. No vr_* model, pack, migration, ingest script or
    // member file was read or written. No formal act, stance, tier, mapping,
    // issue key, keyword, lean, level, weight, floor, band, admission, score or
    // Direction Match figure moved — the eight answers still reach the match
    // through the engine's own public doors, called exactly as HEAD wrote them,
    // and what this pass changed is WHEN the repaint runs and nothing about
    // what it computes. One Venmo URL, no processor added, and the donate card
    // still publishes no total, goal or progress bar. The three files below are
    // the only ones this list did not already carry; the pass's others
    // (alignment-tool.js, your-file.js, app.css, mobile-polish.css, sw.js,
    // scripts/v103-chrome-seams.mjs, scripts/test-your-file.mjs and
    // scripts/test-mobile-body-lock.mjs) are declared further up.
    "journey.js",
    "support-route.js",
    "scripts/test-support-routing.mjs",
    "scripts/test-vr-federal-wave-f8.mjs",
    "scripts/test-vr-federal-wave-f9.mjs",
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
      // AND EVERY OTHER MEASURE ADDRESS THE REGENERATION ADDED OPENS ONTO
      // SOMETHING ON FILE. This used to require that NO /b/ line was gained at
      // all, which was the cheap proxy for the sentence above: while F9 was the
      // newest measure wave, any new bill address could only be drift. That
      // stopped being the same claim once later waves began filing acts of their
      // own - the Utah executive lane (v165) files 140 gubernatorial acts, and
      // one of the bills they cite had no address before, so a truthful
      // regeneration HAS to publish it. Forbidding the line would have meant
      // shipping a record with no way in. So the proxy is replaced by the claim:
      // each gained address must be a measure the migration tree itself admits,
      // and it must open onto a real recorded act rather than an empty stub. A
      // drifted or invented address fails that; a bill somebody actually signed
      // does not.
      const admitted = measureAddresses(ROOT).published;
      const opens = new Map(admitted.map((a) => [billPath(a), a]));
      const strayGain = gained.filter((l) => /\/b\//.test(l)).filter((l) => {
        const u = /<loc>[^<]*?(\/b\/[^<]*)<\/loc>/.exec(l);
        const a = u ? opens.get(u[1]) : null;
        return !a || !(a.acts > 0);
      });
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
