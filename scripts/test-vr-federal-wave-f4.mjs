#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-federal-wave-f4.mjs — one flag moved, and everything else held still
// ─────────────────────────────────────────────────────────────────────────────
// F4 is the smallest federal wave so far and the easiest to fake, because it ships a
// coverage number without shipping any evidence: no measure, no roll call, no member
// vote, no issue row, no key. One boolean flips and 193 members start being
// characterised on `housing`. There are six ways to get that number dishonestly, and
// this file closes all six.
//
//   1. LOWER A FLOOR. _RD_MIN_PRIMARY = 0 makes every `incidental` row in the corpus
//      readable at once, for free — the same 193 rows and more, with no argument at
//      all. Section 8 reads the nine literals out of stance-helpers.js and pins them.
//   2. PROMOTE A PACKAGE. Forty candidates would each have moved a comparable number
//      of rows, and thirty-nine of them are one title of a vehicle. Section 4 requires
//      every refusal to be an argument with an instrument in it, and section 5 requires
//      the migration to assert the sixteen live ones as still-not-primary so a later
//      pass cannot quietly contradict the argument without tripping.
//   3. INVENT OR STRETCH A KEY. Section 6 requires keysAdded 0, requires every key the
//      wave names to already exist in db/issue-keys.json, and requires the promoted
//      row's argument to be made against the key's PUBLISHED CHIP rather than against
//      the bill's title — because the chip is what a reader sees.
//   4. DUMP ON A COUSIN. housing / housing_build / housing_support sit next to each
//      other and the promoted measure genuinely contains text for all three. Section 7
//      requires the wall to be written, requires housing_build to keep its w100
//      primary, and requires the migration to assert housing_support and
//      disaster_resilience as ZERO rows on this very measure.
//   5. QUIETLY BECOME AN INGEST. Section 2 requires the vote seed to be empty, requires
//      the emitted SQL to contain no INSERT of any kind, and requires the sweep
//      arithmetic that justifies the emptiness to add up.
//   6. REPORT ONLY THE WINS. Section 9 requires the loss disclosure to exist, to be
//      checked over BOTH chambers, and to be quoted by the migration's own header with
//      the same numbers.
//
// AND THE SEVENTH, WHICH IS NOT A FAKE BUT A BREAKAGE. F4 changes no shipped file at
// all — its whole footprint is scripts/, db/ and one migration — so the twin boot in
// section 10 is the strongest form available: HEAD and the working tree are booted side
// by side and Direction Match, the scoped read and every per-issue row must come out
// bit-for-bit identical, with no waiver list of any kind. Section 10 also asserts that
// no booted file names the promoted measure or carries a mapping literal for it — the
// thing byte-identity to HEAD was standing in for, said directly, so the check keeps
// failing for F4's own reasons and stops failing for everyone else's.
//
// WHY THE READ-LOSS CHECK IS PINNED HERE AND MEASURED THERE. The authoritative no-loss
// check needs the live database, which no test in this suite touches. It lives in
// scripts/vr-federal-fpi.mjs (readSets(), printed as "rows that stopped being
// characterised") and its RESULT is recorded in the decision seed. What this file
// guarantees is that the check still exists, that it was run over both chambers, and
// that the recorded result is self-consistent and quoted unchanged in the migration.
//
//   node scripts/test-vr-federal-wave-f4.mjs
//
// Exit code is non-zero on the first failure so it can gate CI.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from "node:fs";
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
const MIG = "20261018000000_vr_federal_wave_f4.sql";
const VOTES = "db/vr-federal-wave-f4-vote-seed.json";
const DECIDE = "db/vr-federal-mapping-seed-f4.json";
const GEN = "scripts/vr-gen-federal-wave-f4-migration.mjs";

const MIG_SQL = existsSync(join(ROOT, MIG_DIR, MIG)) ? R(join(MIG_DIR, MIG)) : "";
const votes = J(VOTES);
const decide = J(DECIDE);
const issueKeys = new Set((J("db/issue-keys.json").keys || []).map((k) => (typeof k === "string" ? k : k.key)));

// A bill or resolution citation, which is what "names an instrument" means here. The
// alternation is ordered longest-first so "H.J.Res. 140" is not matched as "H.R." — and
// S.Amdt. is included because two refusals turn on an amendment's own subject.
const INSTRUMENT = /\b(?:H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.Res\.|S\.Res\.|S\.Amdt\.|H\.Amdt\.|H\.R\.|S\.)\s?\d+/;

ok(MIG_SQL.length > 0, `${MIG} does not exist`);

// ── 1. the one act, field by field ───────────────────────────────────────────
// Every literal here is restated rather than read from the seed, because the seed is
// the thing under test. The from-state is as load-bearing as the to-state: the promote
// is fail-closed on it, so a seed that drifts on `from` produces a migration that
// either refuses to apply or applies to a row nobody argued about.
{
  const P = (decide.promotes || [])[0];
  eq((decide.promotes || []).length, 1, "F4 decided exactly one act");
  eq((decide.measures || []).length, 0, "F4 admits no new measure");
  eq((decide.retractions || []).length, 0, "F4 retracts nothing");
  if (P) {
    eq(P.congress, 119, "the promoted measure's congress");
    eq(P.chamber, "house", "the promoted measure's chamber — H.R. 6644 is House-origin, which is why rule 30 needs its House roll present");
    eq(P.number, "H.R. 6644", "the promoted measure");
    eq(P.issueKey, "housing", "the promoted key");
    eq(P.decision, "ACCEPTED", "the promote carries a decision");
    eq(P.from.weight, 80, "the pre-state weight");
    eq(P.from.isPrimary, false, "the pre-state lane — a promote of a row that is already primary is a no-op dressed as a wave");
    eq(P.from.supportMeaning, "yea_supports", "the pre-state polarity");
    eq(P.to.weight, 80, "the post-state weight — unchanged, which is what keeps housing ranked below housing_build's 100 and the bill page's issue order identical");
    eq(P.to.isPrimary, true, "the post-state lane");
    eq(P.to.supportMeaning, "yea_supports", "the post-state polarity — unchanged, which is what keeps Direction Match out of this wave");
    ok(/119\/2 roll 53/.test(P.instrument) && /89-10/.test(P.instrument),
      "the promote names its Senate roll and tally (119/2 roll 53, 89-10) — the read every promoted row is published through");
    ok(/119\/2 roll 224/.test(P.instrument), "the promote names the House companion roll (rule 30)");
    ok(/govinfo|BILLS-119hr6644enr|PLAW-119publ101/.test(P.textRead),
      "the promote states which TEXT was read — a promote argued from a summary is a promote argued from somebody else's paraphrase");
    ok(!/congress\.gov\/bill/.test(P.sourceUrlWritten || ""),
      "the source_url written is a text, not a congress.gov landing page");
    ok(/^https:\/\//.test(P.sourceUrlWritten || ""), "the source_url written is https");
  }
}

// ── 2. the wave admits nothing, and says so as arithmetic ───────────────────
// An empty vote seed reads as an oversight unless the sweep that emptied it is on the
// record. 63 admissible on form − 18 already live = 45 declined, and 45 is the number
// the seed and the migration both have to be able to justify.
{
  eq((votes.votes || []).length, 0, "the F4 vote seed admits no roll call");
  eq((votes.newMeasures || []).length, 0, "the F4 vote seed creates no measure");
  eq(votes.rollCallCount, 0, "rollCallCount");
  eq(votes.memberVoteCount, 0, "memberVoteCount");
  eq(votes.skippedVoteCount, 0, "skippedVoteCount");
  const e = votes._whyEmpty || {};
  eq(e.swept, 890, "the swept roll count");
  eq(e.admissibleOnForm, 63, "passage-form rolls found");
  eq(e.alreadyInCorpus, 18, "passage-form rolls already live");
  eq(e.unIngestedAdmissible, 45, "un-ingested admissible rolls");
  eq(e.admissibleOnForm - e.alreadyInCorpus, e.unIngestedAdmissible,
    "the sweep arithmetic is internally consistent (admissible − live = declined)");
  eq(decide._counts.rollCallsDeclined, 45, "the decision seed's declined count matches the vote seed's sweep");
  eq(decide._counts.rollCallsAdmitted, 0, "rollCallsAdmitted");
  eq(decide._counts.memberVotesAttributed, 0, "memberVotesAttributed");
  eq(decide._counts.rowsAdded, 0, "rowsAdded — a promote adds no row");
  ok(/vehicle|unanimous-consent|motion to proceed/i.test(e.whatWasNotDone || ""),
    "the vote seed states what was NOT done: no PRIMARY manufactured from a vehicle, a UC passage or a motion to proceed");
  // ATTRIBUTION SKIPS ARE COUNTED, and counted as zero for a stated reason. A blank
  // attribution block and a deliberately-unexercised one look identical in a diff.
  const a = votes.attribution || {};
  ok(/not exercised/i.test(a.senate || ""), "the senator attribution path is recorded as not exercised rather than left blank");
  ok(/not exercised/i.test(a.house || ""), "the House attribution path is recorded as not exercised");
  eq(a.rosterSenatorsIndexed, 99, "the roster the attribution path would have used is still recorded");
  eq((a.ambiguousRosterKeys || []).length, 0, "no ambiguous roster key");
  // NO INSERT. This is the assertion that catches a promote quietly becoming an ingest.
  ok(!/\bINSERT\s+INTO\b/i.test(MIG_SQL), `${MIG} contains an INSERT — F4 writes no row`);
  ok(!/\bDELETE\s+FROM\b/i.test(MIG_SQL), `${MIG} contains a DELETE — F4 retracts nothing`);
  eq((MIG_SQL.match(/\bUPDATE\s+vr_measure_issues\b/gi) || []).length, 1,
    `${MIG} should contain exactly one UPDATE`);
}

// ── 3. the two rolls the act leans on, verified rather than assumed ──────────
// Neither roll is ingested here — both were already live — but a primary flag is being
// hung on them, so their form and their tallies are restated as literals.
{
  const rolls = votes.rollsTheActLeansOn || [];
  eq(rolls.length, 2, "both chambers' rolls are recorded");
  const sen = rolls.find((r) => r.chamber === "senate");
  const hou = rolls.find((r) => r.chamber === "house");
  if (ok(!!sen, "the Senate roll is recorded")) {
    eq(sen.rollNumber, 53, "the Senate roll number");
    eq(sen.congress, 119, "the Senate roll's congress");
    eq(sen.session, 2, "the Senate roll's session");
    eq(sen.question, "On Passage of the Bill", "the Senate question form — rule 12 admits passage forms and nothing else");
    eq(sen.attributedMemberVotes, 98, "senators attributed on the Senate roll");
    eq(sen.alreadyLive, true, "the Senate roll is already in the corpus");
    ok(/10\.101/.test(JSON.stringify(sen.ruleChecks || {})),
      "rule 11 is checked with its actual figure (10.101%), not asserted as 'comfortable' — it clears the one-tenth bar by a tenth of a point and a reader is entitled to see that");
    ok((sen.notVoting || []).length === 1 && sen.notVoting[0] === "blackburn",
      "the one absence is named — which is why the Senate gain is 97 and not 98");
  }
  if (ok(!!hou, "the House roll is recorded")) {
    eq(hou.rollNumber, 224, "the House roll number");
    eq(hou.attributedMemberVotes, 108, "representatives attributed on the House roll");
    ok(/not a plain passage form|concurrence/i.test(JSON.stringify(hou.ruleChecks || {})),
      "the House roll's question form is described accurately — it is a concurrence under suspension, not a passage vote, and calling it one would be the easiest false detail in the file");
    ok(/BELOW the one-tenth bar|8\.21/.test(JSON.stringify(hou.ruleChecks || {})),
      "the House roll's near-consensus tally is disclosed rather than buried");
  }
}

// ── 4. forty refusals, each an argument with an instrument in it ─────────────
// The wave's whole claim is that thirty-nine of the forty movers are packages. That is
// only checkable if each refusal names what it refused and why, so a refusal that is a
// label rather than an argument fails here.
{
  const d = decide.declinedPromotes || [];
  ok(d.length >= 20, `at least twenty refusals are written out (found ${d.length})`);
  eq(decide._counts.promotesRefused, 40, "the refused-candidate count");
  eq(decide._counts.candidatePromotesSimulated, 41, "candidates simulated");
  eq(decide._counts.promotesAccepted, 1, "candidates accepted");
  eq(decide._counts.promotesSimulatedMinusAccepted ?? (decide._counts.candidatePromotesSimulated - decide._counts.promotesAccepted),
    decide._counts.promotesRefused, "simulated − accepted = refused");
  let thin = 0, noInstrument = 0;
  for (const r of d) {
    if (String(r.why || "").length < 120) { thin++; failures.push(`the refusal on ${r.key} is a label, not an argument: ${r.why}`); }
    const hay = `${r.candidate || ""} ${r.candidates || ""} ${r.why || ""}`;
    if (!INSTRUMENT.test(hay) && !/no live row|the three other live rows/.test(hay)) {
      noInstrument++; failures.push(`the refusal on ${r.key} names no instrument`);
    }
  }
  eq(thin, 0, "every refusal is an argument");
  eq(noInstrument, 0, "every refusal names the instrument it refused");
  // The named doctrine walls, each present by name somewhere in the refusals.
  const all = JSON.stringify(d);
  for (const [needle, what] of [
    ["Rescissions Act", "H.R. 4, the eight-key act five separate keys could have been promoted off"],
    ["reconciliation", "the reconciliation refusal"],
    ["American Rescue Plan", "the ARPA package refusal"],
    ["infrastructure act", "the IIJA package refusal"],
    ["Inflation Reduction Act", "the IRA package refusal"],
    ["continuing resolution", "the vehicle refusal — H.R. 1968 was the largest number on the table"],
    ["keyword", "the rural_ag keyword lesson, reapplied to H.J.Res. 20 as water"],
  ]) ok(all.includes(needle), `the refusals do not mention ${what}`);
  // The largest numbers on the table were refused, which is the point.
  const big = d.find((r) => r.key === "health_rural");
  ok(big && big.onOffer === 98, "the 98-row candidate (H.R. 1968 / health_rural) is on the record as refused with its number attached");
}

// ── 5. the migration, generated and guarded ─────────────────────────────────
{
  // Regenerated byte-for-byte from the seeds. A hand-edited migration is a migration
  // whose header no longer describes what its SQL does.
  let regen = "";
  try { regen = execFileSync("node", [join(ROOT, GEN)], { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }); }
  catch (e) { failures.push(`${GEN} did not run: ${e.message}`); }
  if (regen) eq(regen.trim(), MIG_SQL.trim(), `${MIG} is not what ${GEN} emits — regenerate rather than hand-edit`);

  // Fail-closed on the pre-state, all three ways.
  ok(/cur\.weight <> 80/.test(MIG_SQL), "the migration does not guard the pre-state weight");
  ok(/cur\.support_meaning <> 'yea_supports'/.test(MIG_SQL), "the migration does not guard the pre-state polarity");
  ok(/cur\.rationale NOT LIKE 'Secondary:%'/.test(MIG_SQL),
    "the migration does not guard the pre-state rationale — overwriting a rationale a later writer has replaced is runbook rule 21 violated by a migration");
  ok(/IF cur\.is_primary THEN[\s\S]{0,600}RETURN;/.test(MIG_SQL),
    "the migration is not idempotent — a second run must find the flag set, check nothing else moved, and stop");
  ok(/RAISE EXCEPTION/.test(MIG_SQL) && (MIG_SQL.match(/RAISE EXCEPTION/g) || []).length >= 20,
    "the migration should carry a RAISE for every guard and every refusal it asserts");

  // The rationale that lands in the database is the one the seed argued.
  const P = (decide.promotes || [])[0] || {};
  ok(MIG_SQL.includes(String(P.rationale || "@@").replace(/'/g, "''")),
    "the rationale in the migration is not the rationale in the seed");
  ok(/is_primary = TRUE/.test(MIG_SQL), "the migration does not set the lane");
  ok(!/weight\s*=\s*\d+/.test(MIG_SQL.slice(MIG_SQL.indexOf("UPDATE vr_measure_issues"), MIG_SQL.indexOf("WHERE id = cur.id"))),
    "the UPDATE moves a weight — F4 changes the flag, the rationale and the source, and nothing else");

  // The verification block is scoped to the row this file writes.
  ok(/n_rows <> 4/.test(MIG_SQL), "the migration does not assert that the measure still carries exactly its four rows");
  ok(/issue_key = 'housing_build' AND is_primary AND weight = 100/.test(MIG_SQL),
    "the migration does not assert that housing_build keeps the w100 primary");
  ok(/n_sen_primary < 1/.test(MIG_SQL), "the migration does not assert the wave's own purpose as a floor");
  ok(/rule 30/.test(MIG_SQL) && /chamber = 'house'/.test(MIG_SQL),
    "the migration does not check rule 30's second corollary on its own instrument");
  ok(!/COUNT\(\*\) FROM vr_measure_issues;/i.test(MIG_SQL),
    "the migration asserts a GLOBAL row count — scope the guard to the rows this file writes, or the next wave will relax it until it means nothing");

  // The refusals, executable. Sixteen live (measure, key) pairs asserted non-primary
  // and two keys asserted absent from the promoted measure.
  const refusedAsserts = (MIG_SQL.match(/was MEASURED AND REFUSED as a primary-lane promote/g) || []).length;
  eq(refusedAsserts, 16, "the migration should assert all sixteen measured-and-refused promotes as still non-primary");
  for (const k of ["housing_support", "disaster_resilience"]) {
    ok(new RegExp(`${k} was READ AND REFUSED as a new row`).test(MIG_SQL),
      `the migration does not assert ${k} as absent from H.R. 6644 — the temptation this wave's own instrument created`);
  }
}

// ── 6. no key invented, and the argument is made against the chip ───────────
{
  eq(decide.vocab.keysAdded, 0, "keysAdded");
  eq(decide._counts.keysAdded, 0, "keysAdded in the counts");
  eq(decide.vocab.proposal.shipped, false, "the one vocabulary finding is a proposal, not a shipped key");
  ok(/proposals\.md/.test(decide.vocab.proposal.where || ""), "the proposal is filed in db/vr-issue-key-proposals.md");
  ok(/two-instrument|two instruments|nothing to map/.test(decide.vocab.proposal.whyNotShipped || ""),
    "the proposal states which part of the V1 bar it fails");
  ok(existsSync(join(ROOT, "db/vr-issue-key-proposals.md")), "db/vr-issue-key-proposals.md exists");
  // Every key the wave names is a key that already exists.
  const named = new Set();
  for (const p of decide.promotes || []) named.add(p.issueKey);
  for (const r of decide.declinedPromotes || []) for (const k of String(r.key).split(",")) named.add(k.trim());
  for (const b of decide.blockedOn || []) for (const k of String(b.key).split(",")) named.add(k.trim());
  let unknown = [];
  for (const k of named) if (!issueKeys.has(k)) unknown.push(k);
  eq(unknown.length, 0, `F4 names ${unknown.length} key(s) that are not in db/issue-keys.json: ${unknown.join(", ")}`);
  // THE ARGUMENT IS AGAINST THE PUBLISHED CHIP, not the bill's title. The chip is what
  // a reader sees, so it is what the mapping has to satisfy — and this wave's caveat is
  // precisely that the Act's long title says something narrower than its chip.
  const P = (decide.promotes || [])[0] || {};
  const chip = "Make housing more affordable by boosting supply and lowering the cost to build and buy";
  ok(R("alignment-tool.js").includes(chip), "the housing chip this wave argues against is still the published chip");
  ok(String(P.rationale).includes(chip), "the promoted rationale does not quote the published chip it claims to satisfy");
  ok(/long title/.test(P.theCaveat || ""), "the caveat about the Act's long title is not stated");
  ok(/no findings or purposes section|findings/.test(P.theCaveat || ""),
    "the caveat does not state that the Act has no findings or purposes section to read either way");
}

// ── 7. the cousin wall, written and asserted ───────────────────────────────
{
  const P = (decide.promotes || [])[0] || {};
  const cw = P.cousinWall || "";
  for (const k of ["housing_build", "housing_support"]) ok(cw.includes(k), `the cousin wall does not name ${k}`);
  ok(/zoning/.test(cw), "the cousin wall does not use housing_build's own chip language (zoning and permitting) as the discriminator");
  ok(/eviction/.test(cw), "the cousin wall does not use housing_support's own chip language (eviction limits) as the discriminator");
  // housing_support is refused on the very measure this wave promotes, and the refusal
  // is arithmetic as well as textual.
  const hs = (decide.declinedPromotes || []).find((r) => r.key === "housing_support");
  if (ok(!!hs, "housing_support is refused in writing on H.R. 6644")) {
    eq(hs.onOffer, 0, "the housing_support refusal states what it would have gained: nothing");
    ok(/eviction/.test(hs.why) && /gain zero|gains zero/.test(hs.why),
      "the housing_support refusal argues both the chip and the measured arithmetic");
  }
  const dr = (decide.declinedPromotes || []).find((r) => r.key === "disaster_resilience" && /6644/.test(JSON.stringify(r)));
  ok(!!dr || /6644/.test(JSON.stringify((decide.declinedPromotes || []).find((r) => r.key === "disaster_resilience") || {})),
    "the Sec. 504 disaster_resilience temptation on the wave's own instrument is refused in writing");
  // The three published chips are still three different chips.
  const at = R("alignment-tool.js");
  for (const [key, needle] of [
    ["housing", "boosting supply and lowering the cost to build and buy"],
    ["housing_build", "Loosen zoning and permitting"],
    ["housing_support", "protect renters with assistance and limits on evictions"],
  ]) ok(at.includes(needle), `${key}'s chip changed — the cousin wall is argued against the published text, so it must be re-argued if the text moves`);
}

// ── 8. every blocked key names an instrument ────────────────────────────────
// The brief's own test, and the one that keeps a blocked key from being a shrug. A
// blocked entry has to say what bill would unblock it, or it is not a finding.
{
  const b = decide.blockedOn || [];
  ok(b.length >= 15, `the blocked list is the wave's real output (found ${b.length} entries)`);
  let nameless = 0, reasonless = 0;
  for (const e of b) {
    const hay = `${e.evidence || ""} ${e.whatWouldUnblockIt || ""}`;
    // Three keys are blocked because NO instrument exists to name, and they say so
    // explicitly — that is a finding, not an omission, so it is admitted by name.
    const noInstrumentExists = /no standalone .* exists|None is pending|no Senate-reachable act|It is not blocked/i.test(hay);
    if (!INSTRUMENT.test(hay) && !noInstrumentExists) { nameless++; failures.push(`blocked key ${e.key} names no instrument and does not say that none exists`); }
    if (!e.state || !e.whatWouldUnblockIt) { reasonless++; failures.push(`blocked key ${e.key} is missing state or whatWouldUnblockIt`); }
  }
  eq(nameless, 0, "every blocked key names the bill it needs, or states that no such bill exists");
  eq(reasonless, 0, "every blocked key carries a state and an unblock condition");
  // The seven the brief held back were RE-VERIFIED, not carried over. Each of the five
  // with a named bill is asserted to record the literal zero-occurrence finding.
  for (const [key, bill] of [["health_rural", "S. 2683"], ["free_speech", "S. 146"], ["econ_smallbiz", "H.R. 3193"],
    ["econ_workers", "H.R. 5408"], ["scotus_reform", "S. 1101"]]) {
    const e = b.find((x) => x.key === key);
    if (!ok(!!e, `${key} is not in the blocked list`)) continue;
    ok(e.evidence.includes(bill), `${key}'s evidence does not name ${bill}`);
    ok(/0 of|NONE of the 890|none of the 890|zero rolls|unanimous consent/i.test(e.evidence),
      `${key}'s evidence does not record the re-verification against the 890-roll sweep`);
  }
  // gov_regulation is in the list as NOT blocked, which is the honest entry for a key
  // whose 21 available rolls would each cost a read.
  const gr = b.find((x) => x.key === "gov_regulation");
  if (ok(!!gr, "gov_regulation's status is recorded")) {
    ok(/NOT blocked/i.test(gr.state), "gov_regulation should be recorded as not blocked rather than queued");
    ok(/king/i.test(gr.evidence) && /lujan/i.test(gr.evidence), "the measured King/Lujan cost is carried, not re-derived");
    ok(/rule 30/i.test(gr.evidence), "the rule 30 wall is cited: a key is fixed by supplying a PRIMARY, never by a further secondary");
  }
}

// ── 9. floors, literal ──────────────────────────────────────────────────────
// Read out of the shipped file, not out of the seed. A wave that claims 193 new reads
// while a floor moved has not densified anything.
{
  const sh = R("stance-helpers.js");
  for (const [name, value] of [
    ["_RD_MIN_STRENGTH", "4"], ["_RD_THIN_MIN_STRENGTH", "0.6"], ["_RD_MIN_JUDGED", "4"],
    ["_RD_DOMINANCE", "0.75"], ["_RD_THIN_MIN", "2"], ["_RD_MIN_PRIMARY", "1"],
    ["_RD_SPLIT_MIN_JUDGED", "6"], ["_RD_SPLIT_MIN_SIDE", "2"],
  ]) {
    const m = sh.match(new RegExp(`${name}\\s*=\\s*([\\d.]+)`));
    ok(!!m, `${name} is not in stance-helpers.js`) && eq(m[1], value, `${name} moved`);
  }
  const mf = sh.match(/_PDX_RD_MEMBER_FLOOR\s*=\s*(\d+)/) || sh.match(/_RD_MEMBER_FLOOR\s*=\s*(\d+)/);
  ok(!!mf, "the member floor literal is not in stance-helpers.js") && eq(mf[1], "12", "the member floor moved");
  eq(decide._counts.floorsMoved, 0, "floorsMoved");
  // And the migration says so, so a reader of the SQL alone knows.
  for (const n of ["_RD_MIN_PRIMARY stays 1", "_RD_MIN_JUDGED stays 4", "_RD_THIN_MIN stays 2"])
    ok(MIG_SQL.includes(n), `${MIG}'s header does not state that ${n.split(" stays")[0]} is unmoved`);
}

// ── 10. gains and losses, both chambers, quoted unchanged ───────────────────
{
  const disc = decide.readLossDisclosure || {};
  const t = disc.totals || {};
  eq(t.lost, 0, "rows that stopped being characterised");
  eq(t.gained, 193, "rows that started being characterised");
  eq(t.gainedByChamber.senate, 97, "senator rows gained");
  eq(t.gainedByChamber.house, 96, "House rows gained");
  eq(t.gainedByChamber.senate + t.gainedByChamber.house, t.gained, "the chamber split adds up to the total");
  eq(t.membersChecked, 327, "members checked");
  eq(t.gainedByKey.housing, 193, "all gains are on the promoted key");
  eq(Object.keys(t.gainedByKey).length, 1, "no gain is claimed on a key this wave did not touch");
  eq(t.gainedTiers.thin, 193, "all gains read at tier thin, which is the honest tier for a single judged act");
  eq(Object.keys(t.lostTiers || {}).length, 0, "no tier lost a row");
  ok(/--set all/.test(disc.checkedBy || "") && /both chambers|--set senate/.test(disc.checkedBy || ""),
    "the loss check must be recorded as run over BOTH chambers — 96 of the 193 gains are representatives, so a senator-only check measures half the wave");
  ok(/readSets/.test(disc.checkedBy || ""), "the loss check names the function that performs it");
  // The census deltas, and the migration header quoting the same numbers.
  const c = decide._counts;
  eq(c.senateKeysWithPrimaryBefore, 37, "Senate keys with a PRIMARY, before");
  eq(c.senateKeysWithPrimaryAfter, 38, "Senate keys with a PRIMARY, after");
  eq(c.senateKeysWithPrimaryAfter - c.senateKeysWithPrimaryBefore, 1, "the wave claims exactly one key gained a Senate PRIMARY");
  eq(c.senateUnreadRowsBefore - c.senateUnreadRowsAfter, 97,
    "the unread-row delta must equal the senator gain — a bigger drop would mean rows left the denominator rather than becoming readable");
  eq(c.senateIncidentalRowsBefore - c.senateIncidentalRowsAfter, 97,
    "the whole senator gain must come out of the `incidental` bucket, which is the bucket the primary wall fills");
  const HEADER = MIG_SQL.slice(0, MIG_SQL.indexOf("DO $")).replace(/^--\s?/gm, "").replace(/\s+/g, " ");
  ok(HEADER.includes(`+${t.gained} rows started being characterised`), `${MIG}'s header does not quote the gain of ${t.gained}`);
  ok(HEADER.includes(`and ${t.lost} stopped`), `${MIG}'s header does not quote the loss of ${t.lost}`);
  ok(HEADER.includes(`${t.gainedByChamber.senate} senators, ${t.gainedByChamber.house} representatives`),
    `${MIG}'s header does not quote the chamber split — the whole point of not netting`);
  ok(HEADER.includes(`${c.senateUnreadRowsBefore} → ${c.senateUnreadRowsAfter}`), `${MIG}'s header does not quote the unread-row delta`);
  // The acceptance faces.
  const af = decide.acceptanceFaces || {};
  for (const face of ["lee", "curtis"]) {
    ok(/GAINS a characterised key/.test(af[face] || ""), `the ${face} acceptance face is not answered with a measured outcome`);
    ok(INSTRUMENT.test(af[face] || ""), `the ${face} acceptance face does not name the instrument`);
  }
  const u = disc.utahSix || {};
  eq(u.gained, 6, "all six Utah federal members gain the key");
  eq(u.lost, 0, "no Utah row is lost");
  eq((u.rows || []).length, 6, "each Utah row is named with its act");
  const leeRow = (u.rows || []).find((r) => r.pid === "lee");
  const curtisRow = (u.rows || []).find((r) => r.pid === "curtis");
  ok(leeRow && /nay/.test(leeRow.act), "Lee's recorded position on the promoted act is nay");
  ok(curtisRow && /yea/.test(curtisRow.act), "Curtis's recorded position on the promoted act is yea");
  ok(/no Utah-only ingest|not require|No Utah-only/i.test(JSON.stringify(af) + JSON.stringify(u)),
    "the record should state that no Utah-only ingest was performed");
}

// ── 11. the contradiction that was surfaced rather than fixed (rule 25) ─────
// econ_trade was tied for the top of the volume ranking and is refused. A wave that
// ships 97 rows off an axis the corpus cannot agree on, and does not mention it, has
// measured the wrong thing. A wave that quietly flips a support_meaning to fix it has
// broken its own doctrine. So the finding is published, and this asserts that.
{
  const sc = decide.surfacedContradictions || [];
  eq(sc.length, 1, "the one surfaced contradiction is on the record");
  const c0 = sc[0] || {};
  ok(/econ_trade/.test(c0.where || ""), "the contradiction names the key and the row");
  ok(/yea_supports/.test(c0.what || ""), "the contradiction states the polarity that cannot be right twice");
  ok(/Direction Match|DM/.test(c0.whyItIsNotFixedHere || ""),
    "the reason it is not fixed here must be the Direction Match wall, stated");
  ok(/rule 25/.test(JSON.stringify(c0)), "the runbook rule being followed is cited");
  ok(/97/.test(c0.whyItMatteredToTHISWave || ""), "the contradiction does not state what it cost this wave");
  ok(/dedicated/.test(c0.whatWouldFixIt || ""), "the contradiction does not say what would fix it");
  // And the refusal in the main list agrees with it, rather than giving a different reason.
  const et = (decide.declinedPromotes || []).find((r) => r.key === "econ_trade");
  ok(et && /surfacedContradictions|contradiction/.test(et.why), "the econ_trade refusal does not point at the surfaced contradiction");
}

// ── 12. twin boot: nothing shipped moved, and nothing shipped changed ───────
// The strongest form of this check, available because F4's footprint is scripts/, db/
// and one migration. There is no waiver list. The mappings this wave changes live in
// the DATABASE, so a curator who hard-coded the promoted row into voting-record.js or
// stance-helpers.js to make the numbers move sooner would be caught right here.
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
  // THE MAPPING MAY NOT LEAK INTO A BOOTED FILE. This began as byte-identity
  // against HEAD, which was true of F4 by construction and is the sharper
  // statement — but it is not the statement this section is FOR. A promote lives
  // in the database; what would make the coverage number dishonest is the promote
  // being hard-coded into a file the browser boots, so that the renderer asserts a
  // mapping the database does not hold. Byte-identity caught that, and also caught
  // every unrelated edit anyone ever makes to consistency.js — a repo-wide freeze
  // wearing a wave-scoped claim, which fails for reasons that have nothing to do
  // with F4 and teaches a reader to waive it.
  //   So the claim is now the one it was always making: no booted file names the
  // promoted measure, and no booted file carries a mapping literal for it. The
  // shipped mapping data lives in db/ and reaches the browser through the API. The
  // output comparison below is unchanged and is still run with no waiver list, so
  // a booted file that changed in some OTHER way still has to produce identical
  // Direction Match, scoped-read and per-issue figures.
  //   NAMING THE MEASURE IS NOT LEAKING IT. consistency.js carries a curated
  // did/why paragraph for 'H.R. 6644|119|housing' and cmp-data.js cites the
  // concurrence vote in a profile detail — prose about a measure, shipped long
  // before this wave, and exactly the kind of sourced writing the site is for.
  // What may not appear beside that number is the MAPPING: a weight, a support
  // meaning, or a primary flag, which are the database's to hold and the API's to
  // deliver. So the scan is positional — every mention of the measure, and the
  // text around it — rather than a bare substring test.
  const MEASURE = "6644";
  const MAPPING_FIELD = /is_?[Pp]rimary|support_?[Mm]eaning|\bweight\b/;
  let leaked = [];
  for (const f of FILES) {
    const src = nowSrc(f);
    if (src === null) continue;
    let at = src.indexOf(MEASURE);
    while (at >= 0) {
      const around = src.slice(Math.max(0, at - 400), at + 400);
      if (MAPPING_FIELD.test(around)) {
        leaked.push(`${f} carries a mapping literal beside the promoted measure`);
        break;
      }
      at = src.indexOf(MEASURE, at + 1);
    }
  }
  eq(leaked.length, 0, `a promote lives in the database, not in a booted file — ${leaked.join(", ")}`);
  // And the diff against HEAD is still reported, because a booted file that moved
  // during a wave whose footprint is scripts/, db/ and one migration is worth
  // naming out loud even when its outputs match.
  let touched = [];
  for (const f of FILES) {
    const h = headSrc(f);
    if (h === null) continue;
    if (h !== nowSrc(f)) touched.push(f);
  }
  if (touched.length) console.log(`      (booted files differing from HEAD: ${touched.join(", ")} — outputs compared below)`);

  const head = boot(headSrc, "HEAD");
  const work = boot(nowSrc, "working");
  if (ok(!!(head && head.PDXWordAction && head.PDXWordAction.read), "the pre-wave engine booted from HEAD")
    && ok(!!(work && work.PDXWordAction && work.PDXWordAction.read), "the current engine booted")) {
    const PIDS = Object.keys(head.CMP_DATA || {});
    ok(PIDS.length > 100, `the roster booted (${PIDS.length} profiles)`);
    {
      const nowPids = Object.keys(work.CMP_DATA || {});
      const nowSet = new Set(nowPids), headSet = new Set(PIDS);
      const gone = PIDS.filter((p) => !nowSet.has(p));
      const added = nowPids.filter((p) => !headSet.has(p));
      eq(gone.length, 0, `F4 removed ${gone.length} profile(s) from the roster: ${gone.slice(0, 8).join(", ")}`);
      eq(added.length, 0, `F4 added ${added.length} profile(s) to the roster: ${added.slice(0, 8).join(", ")}`);
    }
    const READ_KEYS = ["pct", "publishable", "word", "testedWeight"];
    const COV_KEYS = ["word", "scorable", "tested", "untested", "issueLinked",
      "notIssueLinked", "recordDerived", "warming"];
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
    eq(dmBad, 0, "Direction Match drifted");

    let scoped = 0, scopedBad = 0;
    for (const pid of PIDS) {
      let a = null, b = null;
      try { a = head.PDXWordAction.scopedRead(pid, head.CMP_DATA[pid]); } catch (e) { continue; }
      try { b = work.PDXWordAction.scopedRead(pid, work.CMP_DATA[pid]); } catch (e) { b = null; }
      if (!a) continue;
      if (!b) { scopedBad++; failures.push(`${pid}: the scoped read stopped returning`); continue; }
      scoped++;
      if (JSON.stringify(b.delta) !== JSON.stringify(a.delta)) { scopedBad++; failures.push(`${pid}: the all-time/term delta moved`); }
      for (const slice of ["main", "current"]) {
        const sa = a[slice], sb = b[slice];
        if (!!sa !== !!sb) { scopedBad++; failures.push(`${pid}: the ${slice} slice appeared or vanished`); continue; }
        if (!sa || !sb) continue;
        if (sb.pct !== sa.pct) { scopedBad++; failures.push(`${pid}: ${slice}.pct moved — ${sa.pct} → ${sb.pct}`); }
        if (sb.publishable !== sa.publishable) { scopedBad++; failures.push(`${pid}: ${slice}.publishable moved`); }
      }
    }
    ok(scoped > 100, `the scoped-read sweep was wide enough to mean something (${scoped} profiles)`);
    eq(scopedBad, 0, "the current-term slice drifted");

    let rows = 0, rowBad = 0;
    for (const pid of PIDS) {
      let ra = [], rb = [];
      try { ra = head.PDXConsistency.issueRows(pid) || []; } catch (e) { continue; }
      try { rb = work.PDXConsistency.issueRows(pid) || []; } catch (e) { rb = []; }
      const keysA = ra.map((r) => r.key), keysB = rb.map((r) => r.key);
      if (keysB.join("|") !== keysA.join("|")) { rowBad++; failures.push(`${pid}: the issue-row list changed — ${keysA.length} rows → ${keysB.length}`); }
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
        for (const k of ["state", "metric", "pct"]) if (sb[k] !== sa[k]) { rowBad++; failures.push(`${pid}/${r.key}: row ${k} moved — ${JSON.stringify(sa[k])} → ${JSON.stringify(sb[k])}`); }
        if ((q.verdict || {}).token !== (r.verdict || {}).token) { rowBad++; failures.push(`${pid}/${r.key}: the verdict moved`); }
      }
    }
    ok(rows > 500, `the issue-row sweep was wide enough to mean something (${rows} rows)`);
    eq(rowBad, 0, "a per-issue row drifted");
    console.log(`      (twin boot: ${dm} DM reads, ${scoped} scoped reads, ${rows} issue rows)`);
  }
}

// ── 13. no party string in reader-facing copy ──────────────────────────────
// The doctrine's flat prohibition, scoped to what reaches a reader: the rationale that
// lands in vr_measure_issues, and the seed's own argument for it. What is forbidden is
// party as a REASON — copy that explains a member's vote or a key's direction by naming
// their side.
//
// TWO THINGS ARE DELIBERATELY OUTSIDE THAT SCOPE. The Senate roll's party breakdown
// (D 44-1, I 2-0, R 43-9 in vr_rollcalls.totals.byParty, which this wave does not
// write) is a fact the document records and what the two-flank check is computed from.
// And the curator-facing note that the nays are nine Republicans and one Democrat is
// rule 11's and rule 23's own arithmetic — it is in the vote seed's ruleChecks, which
// no reader sees, and deleting it would make the record less checkable rather than less
// party-aware.
{
  const P = (decide.promotes || [])[0] || {};
  const readerFacing = [
    ["the promoted rationale", P.rationale],
    ["the cousin wall", P.cousinWall],
    ["the caveat", P.theCaveat],
  ];
  const PARTY = /\b(Republican|Democrat|Democratic|GOP|bipartisan)\b/i;
  for (const [what, text] of readerFacing) {
    ok(!PARTY.test(String(text || "")), `${what} names a party — the record explains a vote by the instrument, never by the member's side`);
  }
  // The rationale that ships must also survive the mapping-discipline bar: an argument
  // and a source, not a label.
  ok(String(P.rationale || "").length > 400, "the promoted rationale is too short to be an argument");
  ok(/Sec\. 211|12 U\.S\.C\./.test(String(P.rationale || "")),
    "the promoted rationale cites no operative provision — a promote argued from titles alone is a promote argued from a table of contents");
  // "bipartisan" appears in the refusals as part of the Bipartisan Safer Communities
  // Act's NAME, which is a citation and not a characterisation. Asserted so that a
  // later reader does not delete it as a violation.
  const bsca = (decide.declinedPromotes || []).find((r) => /S\. 2938/.test(JSON.stringify(r)));
  ok(bsca && /Bipartisan Safer Communities Act/.test(JSON.stringify(bsca)),
    "the S. 2938 refusal should cite the Act by its actual name — a bill's title is a citation, not party copy");
}

// ── report ─────────────────────────────────────────────────────────────────
console.log(`\n  test-vr-federal-wave-f4 — ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
  if (failures.length > 60) console.log(`   … and ${failures.length - 60} more`);
  console.log("");
  process.exit(1);
}
console.log(`  F4: one primary-lane promote on H.R. 6644 · ${decide.readLossDisclosure.totals.gained} rows characterised `
  + `(${decide.readLossDisclosure.totals.gainedByChamber.senate} Sen / ${decide.readLossDisclosure.totals.gainedByChamber.house} Hou), `
  + `${decide.readLossDisclosure.totals.lost} lost · ${decide._counts.promotesRefused} candidates refused in writing · `
  + `keysAdded ${decide._counts.keysAdded} · floors unmoved · DM and every issue row byte-identical to HEAD\n`);
