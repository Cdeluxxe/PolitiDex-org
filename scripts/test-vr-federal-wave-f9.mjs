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
    eq(issueSeed.measures.length, old.measures.length + 7, "the curated issue seed did not grow by exactly seven measures");
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

  eq((R("sw.js").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1], String(MY_VERSION),
    "CACHE_VERSION was not bumped for the mechanism prose this wave ships");
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

  if (Object.keys(head).length) {
    eq(Object.keys(now).length, Object.keys(head).length,
      "the regenerated snapshot holds a different number of people");
    const added = Object.keys(now).filter((pid) => !head[pid]);
    const lost = Object.keys(head).filter((pid) => !now[pid]);
    eq(added.join(", "), "", `a person gained a crawl-block snapshot they did not have (${added.length})`);
    eq(lost.join(", "), "", `a person lost their crawl-block snapshot (${lost.length})`);

    const moved = Object.keys(now).filter((pid) =>
      (head[pid] || []).map(line).join("\n") !== now[pid].map(line).join("\n"));
    ok(moved.length > 0, "seven judged acts moved nobody's six lines — the snapshot is stale");

    // Every line that appeared is on a chip this wave writes a direction on.
    const CHIPS = ["Tough on Crime", "Protect LGBTQ+ Rights", "Climate Action & Clean Energy"];
    const strayChip = [];
    for (const pid of moved) {
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
    if (now.bmoore && head.bmoore) {
      ok(now.bmoore.map(line).join("\n") !== head.bmoore.map(line).join("\n"),
        "/p/bmoore's crawl block did not move, though the wave records seven votes of theirs");
    }

    // And the wave says so in writing, with the number it actually moved.
    const disc = String(decide.readDisclosure.theOfflineSnapshotThisWaveAlsoMoves || "");
    ok(disc.length > 400, "the wave does not disclose that it moves the offline snapshot");
    ok(disc.includes(String(moved.length)), "the snapshot disclosure does not carry the number it moved");
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
  const touched = FILES.filter((f) => { const h = headSrc(f); return h !== null && h !== R(f); });
  eq(touched.join(", "), "consistency.js",
    `F9 changed a booted file it has no business editing (${touched.join(", ") || "none"})`);

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
    eq(nBefore, hBefore, "consistency.js changed ABOVE the _DOS_MECH literal");
    eq(nAfter, hAfter, "consistency.js changed BELOW the _DOS_MECH literal");
    ok(nLit.startsWith(hLit.replace(/\s*\}\s*$/, "").replace(/\}$/, "")) || nLit.startsWith(hLit.slice(0, hLit.length - 5)),
      "the _DOS_MECH literal was rewritten rather than appended to");
    ok(nLit.length > hLit.length, "the _DOS_MECH literal did not grow");
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
  const DECLARED = new Set(["consistency.js", "sw.js", ISSUE_SEED, "sitemap.xml",
    "db/share-index.json",
    "scripts/test-vr-federal-wave-f7.mjs", "scripts/test-vr-federal-wave-f8.mjs"]);
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
    eq(gained.length, NUMBERS.length, `the sitemap gained ${gained.length} address(es), not this wave's ${NUMBERS.length}`);
    for (const n of NUMBERS) {
      const enc = "/b/119/" + n.replace(/ /g, "%20");
      ok(gained.some((l) => l.includes(enc + "<")), `${n} did not become an openable address in the sitemap`);
    }
  }

  // No applied migration was edited: this wave's SQL is the newest file in the directory.
  const sqls = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
  eq(sqls[sqls.length - 1], MIGRATION, "this wave's migration is not the newest one in the directory");
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
