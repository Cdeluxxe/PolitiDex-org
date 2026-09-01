#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-federal-wave-f5.mjs — the wave that wrote nothing, and why that holds
// ─────────────────────────────────────────────────────────────────────────────
// F5 ships no row, no measure, no roll call, no member vote, no key, no floor and no
// migration. The brief allowed for that outcome — "if the census says nothing converts
// this week, stop after the census and say so" — and made it conditional on the census
// being real. So this file does not check a coverage number. It checks that the reasons
// for writing nothing are the reasons claimed, and that nothing was written.
//
// A no-write wave has its own failure modes, and they are the opposite of a shipping
// wave's. There are seven, and this file closes all seven.
//
//   1. WRITE SOMETHING ANYWAY. Section 2 requires that no migration for this wave exists,
//      that the decision seed overlays zero rows, and that every "after" counter equals
//      its "before" counter. A no-write wave that quietly writes one row is worse than a
//      wave that admits it.
//   2. CALL A JUDGEMENT A MEASUREMENT. Option A is refused on arithmetic. Section 3
//      requires all 21 candidates to be simulated one at a time, requires the four Senate
//      counters to be equal before and after, and requires the whole-roster unread
//      breakdown to add up to its own total.
//   3. HIDE THE TWO ROWS THAT ALMOST SHIPPED. The wave drafted, argued and measured two
//      PRIMARY rows and then refused them. Section 4 requires both drafts to survive in
//      the seed with their weight, lane, polarity, rationale and MEASURED COST intact —
//      a refusal whose price is deleted is a refusal nobody can audit.
//   4. REVERSE A STANDING REFUSAL QUIETLY. This is the failure that actually happened
//      mid-wave and was caught by the F2 and F3 tests. Section 5 requires each wall to be
//      quoted, sourced to a file, and answered — and requires the F2/F3 assertion itself
//      to still be satisfied: zero issue mappings on H.R. 1069 in any migration.
//   5. INVENT A KEY TO GET AROUND A WALL. Section 6 requires keysAdded 0, requires all
//      four proposals refused against the six standing rules by name, and requires the
//      public_schools SCOPE NOTE in alignment-tool.js to be untouched — amending a
//      published boundary to admit a row is rule 5's restuffing wearing a scope note.
//   6. LOWER A FLOOR INSTEAD. Section 7 reads the nine floor literals out of
//      stance-helpers.js and pins them.
//   7. LET THE SHIPPED ENGINE DRIFT UNDER COVER OF A QUIET WAVE. Section 8 boots HEAD and
//      the working tree side by side and requires Direction Match, the scoped read and
//      every per-issue row to come out identical, with no waiver list. F5 changes no
//      shipped file, so this is the strongest form available. It also re-checks the
//      attribution ceiling: the seed names 62 members in its projections and every one
//      must resolve on the booted roster.
//
// AND ONE THING THIS FILE DELIBERATELY DOES NOT DO. It does not assert that H.R. 1069 or
// H.R. 973 are unmappable in principle, or that the drafted arguments were wrong. Both
// walls are revisitable by a pass that takes them on their own terms — runbook follow-up
// 0c and runbook rule 3 both say so in their own words. What is pinned is that F5 did not
// take them, and that the next wave inherits the draft rather than a blank page.
//
//   node scripts/test-vr-federal-wave-f5.mjs
//
// Exit code is non-zero on the first failure so it can gate CI.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { CJ_SEAMS, SH_SEAMS, carveSeams, assertConsistencySeams, assertStanceHelpersSeam }
  from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) { passed++; return true; } failures.push(msg); return false; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const MIG_DIR = "netlify/database/migrations";
const DECIDE = "db/vr-federal-mapping-seed-f5.json";
const decide = J(DECIDE);
const issueKeys = new Set((J("db/issue-keys.json").keys || []).map((k) => (typeof k === "string" ? k : k.key)));
const MIGS = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql"));

// ── 1. the seed says what it did, in the field a reader checks first ────────
{
  ok(/NOTHING SHIPS|NO WRITE/i.test(String(decide._comment) + String(decide._status)),
    "the seed's own summary must say that nothing ships — a no-write wave that reads like a shipping wave is the worst of the two");
  const w = decide.whatShipsThisWave || {};
  for (const k of ["rows", "measures", "rollCalls", "memberVotes", "keys", "floorsMoved", "migrations"])
    eq(w[k], 0, `whatShipsThisWave.${k}`);
  ok(String(w._soWhatIsTheProduct || "").length > 300,
    "a wave that ships nothing owes an account of what it produced instead — the brief forbids a wave whose only product is prose, so the account has to name artefacts");
  ok(String(w._whyNoMigrationWasShipped || "").length > 200,
    "the seed must state why no migration accompanies it, or the absence reads as an oversight");
  ok(/census/i.test(String(w._soWhatIsTheProduct)), "the product should name the census");
  ok(/33/.test(String(w._soWhatIsTheProduct)), "the product should name the swept pool a later wave inherits");
}

// ── 2. nothing was written ────────────────────────────────────────────────
{
  const f5migs = MIGS.filter((f) => /f5|wave_f5/i.test(f));
  eq(f5migs.length, 0, `a migration for this wave exists (${f5migs.join(", ")}) — F5 writes nothing, so there is nothing for a migration to carry`);
  eq((decide.measures || []).length, 2, "both examined measures stay on the record even though neither ships");
  const accepted = (decide.measures || []).flatMap((m) => (m.issues || []).filter((i) => i.decision === "ACCEPTED"));
  eq(accepted.length, 0, `${accepted.length} row(s) are still marked ACCEPTED — the wave's decision is that none are`);
  eq((decide.promotes || []).length, 0, "F5 promotes nothing");
  eq((decide.retractions || []).length, 0, "F5 retracts nothing");
  const c = decide._counts;
  eq(c.rowsAccepted, 0, "rowsAccepted");
  eq(c.migrationsShipped, 0, "migrationsShipped");
  eq(c.newMeasures, 0, "newMeasures");
  eq(c.newRollCalls, 0, "newRollCalls");
  eq(c.memberVotesAttributed, 0, "memberVotesAttributed");
  eq(c.keysAdded, 0, "keysAdded");
  eq(c.floorsMoved, 0, "floorsMoved");
  // Every "after" must equal its "before". This is the whole claim of a no-write wave.
  for (const pair of [["clearRows", ""], ["splitRows", ""], ["unreadRows", ""],
    ["senateKeysWithPrimary", ""], ["senateUnreadRows", ""],
    ["publicSchoolsFederalPrimaries", ""], ["govRegulationFederalActsOpposing", ""]]) {
    const [base] = pair;
    eq(c[`${base}After`], c[`${base}Before`], `${base} moved — this wave writes no row, so nothing downstream of a row may move`);
  }
  eq(c.membersMoved, 0, "membersMoved");
  eq(c.issueTierChanges, 0, "issueTierChanges");
  eq(c.readsLost, 0, "readsLost");
  eq(c.readsGained, 0, "readsGained — the one conversion the drafted rows would have made is a projection, not a gain");
  ok(String(c._afterMeansAfterThisWave || "").length > 80,
    "the counters must say what 'after' means here, because the seed also carries projected figures and the two must not be confusable");
  ok(!existsSync(join(ROOT, "db/vr-federal-wave-f5-vote-seed.json")), "a vote seed exists for a wave that ingests nothing");
}

// ── 3. Option A is refused on arithmetic, and the arithmetic is checkable ──
{
  const c = decide._counts;
  eq(c.candidatePromotesSimulated, 21, "candidate promotes simulated — the brief forbids ranking by unread volume, so the whole promotable band was flipped one at a time and diffed");
  eq(c.promotesAccepted, 0, "promotes accepted");
  eq(c.promotesRefused, 21, "promotes refused");
  eq(c.promotesAccepted + c.promotesRefused, c.candidatePromotesSimulated, "every simulated candidate must be accounted for");
  eq(c.senatorsMovedThisWave, 0, "senatorsMoved must be published as 0 rather than omitted");
  eq(c.senateKeysWithPrimaryAfter, 38, "Senate keys with a PRIMARY, unchanged at 38 of 98");
  eq(c.senateUnreadRowsAfter, 1006, "unread senator rows, unchanged at 1006");

  const A = decide.census.questionA_senatePrimaryHoles || {};
  ok(/17 candidate keys, 21 candidate acts/.test(A.measured || ""), "the census does not state the size of the promotable band it measured");
  ok(/one at a time|ONE AT A TIME/i.test(A.measured || ""),
    "the simulations must be one at a time — flipping them together cannot tell which candidate converted what");
  ok(/\+read 0 AND -read 0|\+read 0/.test(A.result || ""), "the census does not state the measured result of the 21 simulations");
  ok(/not raw unread|actually CONVERT|reachable/i.test(A.theBriefsActualQuestion || ""),
    "the census must record that it answered the brief's question (convertible volume) and not the easy one (raw unread)");

  const wr = decide.census.questionA_wholeRoster || {};
  eq(wr.unreadTotal, decide._counts.unreadRowsBefore, "the whole-roster unread total must match the record's own unread count");
  const bd = wr.breakdown || {};
  eq(Object.values(bd).reduce((a, b) => a + b, 0), wr.unreadTotal, "the unread breakdown must add up to the unread total");
  for (const reason of ["no_pole_read", "no_side", "no_side_taken", "no_rollcall"])
    ok(typeof bd[reason] === "number", `the unread breakdown does not account for reason ${reason}`);
  // Every reason has to be a STRUCTURAL one, or the claim "unconvertible" is unearned.
  const sh = R("stance-helpers.js");
  ok(/_RD_NO_POLE/.test(sh), "_RD_NO_POLE is not in stance-helpers.js, so the census's largest bucket cannot be verified");
  ok(/_rdSuppressedKey/.test(sh), "_rdSuppressedKey() is not in stance-helpers.js");
  ok(/balance_key/.test(sh), "the balance_key suppression the census attributes 895 rows to is not in stance-helpers.js");
  ok(/_RD_NO_POLE/.test(String(wr.everyOneOfThemIsStructural || "")) && /balance_key/.test(String(wr.everyOneOfThemIsStructural || "")),
    "the census must name the suppressions it is attributing the unread rows to");
  ok(String(decide.census.whyOptionAIsRefused || "").length > 200, "Option A must be refused in writing, not by omission");
  // And the thin band, which the brief asked about separately.
  const C = decide.census.questionC_thinFormalIndex || {};
  ok(/0 empty, 10 thin, 333 readable/.test(C.bands || ""), "the census does not report the three bands");
  ok(/_PDX_RD_MEMBER_FLOOR|member floor/i.test(C.whyOptionBCannotReachThem || ""),
    "the thin members' actual wall must be named — it is the member floor, which the doctrine forbids moving, not a missing mapping");
  ok(/ingest wave, not a mapping wave/i.test(C.whyOptionBCannotReachThem || ""),
    "the census must say what kind of wave would reach the thin members, rather than implying this one could have");
}

// ── 4. the two rows that almost shipped, kept whole with their price ──────
const CANDIDATES = {
  "H.R. 1069": { key: "public_schools", weight: 90, roll: "313", tally: [247, 164], text: "BILLS-119hr1069eh",
    refused: ["gov_transparency", "strong_defense", "edu_parental", "end_dei", "school_choice", "edu_balance", "states_federal_power"] },
  "H.R. 973": { key: "gov_regulation", weight: 90, roll: "103", tally: [365, 42], text: "BILLS-119hr973eh",
    refused: ["econ_corp_account", "privacy_rights", "tech_innovation", "econ_smallbiz"] },
};
{
  for (const [num, want] of Object.entries(CANDIDATES)) {
    const m = (decide.measures || []).find((x) => x.number === num);
    if (!ok(!!m, `${num} is not in the decision seed`)) continue;
    eq(m.congress, 119, `${num} congress`);
    eq(m.chamber, "house", `${num} chamber`);
    ok(new RegExp(`house 119/1/?( roll )?${want.roll}`).test(JSON.stringify(m.decisiveRoll)),
      `${num} does not name its decisive roll (${want.roll})`);
    ok(new RegExp(`${want.tally[0]}-${want.tally[1]}`).test(JSON.stringify(m.decisiveRoll)),
      `${num} does not print its tally (${want.tally.join("-")})`);
    ok(/REFUSED/.test(m.outcome || ""), `${num}'s outcome does not record that the mapping was refused`);

    // The surviving candidate key is refused, and the DRAFT is kept with its fields.
    const cand = (m.issues || []).find((i) => i.issueKey === want.key);
    if (!ok(!!cand, `${num}'s ${want.key} candidate is not on the record`)) continue;
    eq(cand.decision, "REFUSED", `${num}/${want.key} decision`);
    eq(cand.refusalIsAReversalDeclined, true,
      `${num}/${want.key} must be marked as a declined REVERSAL, not an ordinary refusal — the distinction is the finding`);
    const draft = cand._draftedRowKeptForTheNextPass || {};
    eq(draft.weight, want.weight, `${num}'s drafted weight is not kept`);
    eq(draft.isPrimary, true, `${num}'s drafted lane is not kept`);
    eq(draft.supportMeaning, "yea_opposes", `${num}'s drafted polarity is not kept`);
    ok(String(draft.rationale || "").length > 1500,
      `${num}'s drafted rationale is not kept in full — the next pass to revisit the wall should inherit the argument, not a summary of it`);
    ok(/Sec\. \d|U\.S\.C\.|section 553/.test(String(draft.rationale || "")),
      `${num}'s drafted rationale cites no operative provision`);
    ok(new RegExp(want.text).test(draft.sourceUrl || cand.sourceUrl || ""),
      `${num}'s drafted row does not carry the engrossed text it was argued from (${want.text})`);
    ok(String(draft._why || "").length > 100, `${num}'s kept draft does not say why it is kept`);

    // Every other key on the measure is refused with an argument.
    const gotRefused = (m.issues || []).filter((i) => i.decision === "REFUSED" && i.issueKey !== want.key)
      .map((i) => i.issueKey).sort();
    eq(gotRefused.join(","), [...want.refused].sort().join(","), `${num}'s other refused keys`);
    for (const i of m.issues || []) {
      ok(String(i.why || "").length > 120,
        `${num}/${i.issueKey} is refused without an argument — "refuse the rest in writing" means an argument, not a label`);
      ok(issueKeys.has(i.issueKey), `${num} names ${i.issueKey}, which is not a published key`);
    }
  }
  eq(decide._counts.rowsRefused, 13, "rowsRefused — 8 on H.R. 1069 and 5 on H.R. 973");
  eq(decide._counts.rowsDraftedAndRefusedAsDoctrineReversals, 2, "the two declined reversals must be counted separately from the eleven ordinary refusals");

  // THE PRICE OF THE REFUSAL. A refusal with its measurement deleted cannot be audited,
  // and this one is unusually load-bearing: the measurement is what made the rows look
  // shippable, and it is also what confirmed the runbook was right about one of them.
  const cost = decide.measuredCostOfTheRefusedRows || {};
  ok(String(cost._why || "").length > 150, "the measured cost of the refused rows must be kept with a reason it is kept");
  ok(/NONE OF THESE NUMBERS SHIPPED|NONE.*SHIPPED/i.test(String(cost._why)),
    "the projections must be labelled as projections in the loudest possible terms — they are the numbers a careless reader will quote");
  const had = cost.hadBothRowsShipped || {};
  ok(/4124 → 4198/.test(String(had.clearRows)), "the projected clear-row figure is not on the record");
  ok(/2806 → 2805/.test(String(had.unreadRows)), "the projected unread figure is not on the record");
  eq(had.readsLost, 0, "the projection's read-loss column");
  eq(had.senatorsMoved, 0, "the projection moves no senator either");
  ok(/rule 3/i.test(JSON.stringify(cost.theEffectRule3Predicted || {})) || !!cost.theEffectRule3Predicted,
    "the 38-member effect must be kept under a heading that says the runbook predicted it");
  const t38 = (cost.theEffectRule3Predicted || {}).gov_regulation_strong_to_mostly || {};
  eq(t38.rows, 38, "the 38 gov_regulation transitions — rule 3's stated harm, expressed in members");
  ok(/readSets/.test(String(cost.checkedBy || "")), "the projection must name the function that measured it");
  ok(/--set all/.test(String(cost.checkedBy || "")), "the projection must be recorded as measured over both chambers");
}

// ── 5. the two standing walls, quoted and answered ───────────────────────
{
  const W = decide.standingWallsFound || {};
  eq(decide._counts.standingWallsFound, 2, "standingWallsFound");
  const w1 = W.wall1_HR1069_publicSchools || {}, w2 = W.wall2_HR973_govRegulation || {};
  for (const [label, w, needs] of [
    ["H.R. 1069", w1, ["follow-up 0c", "seed-f1", "funding-level chip"]],
    ["H.R. 973", w2, ["rule 3", "primary operative purpose", "H.R. 973"]],
  ]) {
    ok(/db\/vr-ingest-runbook\.md/.test(w.source || ""), `the ${label} wall does not cite a file a reader can open`);
    ok(String(w.quote || "").length > 200, `the ${label} wall is summarised rather than quoted`);
    ok(String(w.howF5Answers || "").length > 150, `the ${label} wall is not answered — a wall found and not answered is a wall nobody can revisit`);
    for (const n of needs) ok(new RegExp(n.replace(/[.]/g, "\\.")).test(JSON.stringify(w)), `the ${label} wall does not carry "${n}"`);
  }
  // The quotes must actually be in the runbook. A wall paraphrased into something more
  // convenient than the original is how a wall gets talked around.
  const RB = R("db/vr-ingest-runbook.md").replace(/\s+/g, " ");
  ok(RB.includes("The bill stays unmapped until the vocabulary question is decided on its own"),
    "the H.R. 1069 wall as quoted is not in db/vr-ingest-runbook.md — either the runbook moved or the quote is wrong");
  ok(RB.includes("gov_regulation` is about the regulatory question, not about every mandate")
    || RB.includes("gov_regulation is about the regulatory question, not about every mandate"),
    "the H.R. 973 wall as quoted is not in db/vr-ingest-runbook.md");
  ok(RB.includes("it would turn a member's deregulation stance into a contradiction on any safety vote"),
    "rule 3's stated harm is not in the runbook as quoted — this is the sentence the 38-member measurement confirmed");
  ok(/rule 25/i.test(JSON.stringify(decide)), "rule 25 governs a surfaced contradiction and is not cited");
  ok(String(W._theGeneralLesson || "").length > 200,
    "the wave must record what it learned from finding both survivors already refused — the ordering of the checks is the finding");
  ok(/first query|before/i.test(String(W._theGeneralLesson)),
    "the lesson must be actionable for the next census, not a regret");

  // AND THE F2/F3 ASSERTION MUST BE SATISFIED, checked here the same way they check it.
  // The scan reads both plpgsql spellings, because they put the variable on opposite
  // sides of the keyword — `m_hr1069 := (SELECT id …)` and `SELECT id INTO m_hr1069 …`.
  // The version this file shipped read `(\w+)\s*(?::=|INTO)`, which captures the word
  // BEFORE the keyword: correct for `:=`, and for `INTO` it captures "id" and the
  // tripwire cannot fire at all. It also now catches the live id written inline, which
  // is how a row could reach a walled measure without naming it.
  // The scan runs on SQL with its comments removed, the way the F2 and F3 harnesses do
  // it: a commented-out INSERT is not a row, and a header sentence that reaffirms a wall
  // is not a violation of it.
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
  const mapped1069 = mappedRowsFor("H.R. 1069");
  eq(mapped1069.length, 0,
    `H.R. 1069 carries an issue mapping in a migration (${mapped1069.join(", ")}) — the F2 and F3 tests assert zero, and F5 does not reverse the refusal they are asserting`);
  // H.R. 973 IS CHECKED THE SAME WAY, and it has to be. The first version of this check
  // asked whether a file contained an INSERT INTO vr_measure_issues somewhere and the
  // string 'H.R. 973' somewhere — which F6 tripped by DISCLOSING the wall: its header says
  // the chip stands and its verification block raises if a later pass writes the row, so
  // both needles were present and no row was. A wall check that fires on the sentence
  // reaffirming the wall teaches the next writer to delete the sentence, so it resolves the
  // measure's own plpgsql variable and looks for that variable inside a single INSERT.
  const mapped973 = mappedRowsFor("H.R. 973");
  eq(mapped973.length, 0, `H.R. 973 carries an issue mapping in a migration (${mapped973.join(", ")}) — runbook rule 3 keeps it dark`);
  // And S. 2503, which rule 3 names in the same breath.
  ok(/S\. 2503/.test(JSON.stringify(decide)), "S. 2503 is the other bill rule 3 names and it should be on this wave's record too");
}

// ── 6. no key invented, and no scope note bent to admit a row ────────────
{
  eq(decide._counts.keysAdded, 0, "keysAdded");
  eq(decide.vocab.keysAdded, 0, "the vocabulary section agrees that no key was added");
  eq(decide._counts.keysProposedAndRefused, 4, "keysProposedAndRefused");
  eq((decide.vocab.refusedProposals || []).length, 4, "each refused proposal must be written out");
  const RULES = ["rule1_RECURRING", "rule2_CLEAN_POLARITY", "rule3_NOT_A_COUSIN", "rule4_VOTER_LANGUAGE", "rule5_NO_RESTUFFING", "rule6_NO_PARTY_LEAN"];
  for (const p of decide.vocab.refusedProposals || []) {
    ok(!!p.name, "a refused key proposal has no name");
    // Rule 1 RECURRING is a GATE. A proposal with one admissible instrument is dead there,
    // and running it past rules 2 to 6 would be theatre — so rule 1 always, the rest only
    // where rule 1 passed.
    ok(typeof p.rule1_RECURRING === "string" && p.rule1_RECURRING.length > 8,
      `the "${p.name}" proposal is not judged against rule 1 RECURRING, which is the gate`);
    if (/PASSES/.test(p.rule1_RECURRING || "")) {
      const present = RULES.filter((r) => typeof p[r] === "string" && p[r].length > 8);
      ok(present.length >= 4, `the "${p.name}" proposal clears rule 1 and is then judged against only ${present.length} of the six standing rules`);
    } else {
      ok(/FAILS/.test(p.rule1_RECURRING), `the "${p.name}" proposal neither passes nor fails rule 1`);
    }
    ok(/FAILS/.test(JSON.stringify(p)), `the "${p.name}" proposal does not name a rule it FAILS — a refusal without a failing rule is a preference`);
  }
  // The one proposal that would have unblocked H.R. 1069, and the reason it does not.
  const fi = (decide.vocab.refusedProposals || []).find((p) => /foreign influence/i.test(p.name || ""));
  ok(!!fi, "the proposal that would settle runbook follow-up 0c must be on the record — refusing it IS the wave's answer to 0c");
  ok(fi && /rule 5|NO RESTUFFING/i.test(JSON.stringify(fi)), "the foreign-influence refusal turns on rule 5");
  ok(fi && /gov_transparency/.test(JSON.stringify(fi)) && /edu_parental/.test(JSON.stringify(fi)),
    "the foreign-influence refusal must name the keys its instruments already live at");
  eq(decide._counts.runbookFollowUpsAnswered, 1, "the wave answers exactly one open runbook follow-up, and answers it in the negative");

  // THE SCOPE NOTES ARE UNTOUCHED. The tempting move, once a wall is found, is to widen
  // the published boundary until the row fits. That is rule 5's restuffing wearing a scope
  // note, and it moves a boundary every already-shipped row on the key was decided against.
  const at = R("alignment-tool.js");
  const head = execFileSync("git", ["show", "HEAD:alignment-tool.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  eq(at, head, "alignment-tool.js changed — F5 adds no key and bends no scope note; widening a published boundary to admit a refused row is restuffing");
  ok(String(decide.vocab.noKeyRenamedNoScopeNarrowed || "").length > 40,
    "the vocabulary section must state that no key was renamed and no scope narrowed (rule 32)");
  ok(/scope note/i.test(JSON.stringify(decide.standingWallsFound || {})),
    "the wave should state explicitly that it declined to amend the public_schools scope note, since that is the shortcut it had available");
  for (const key of Object.values(CANDIDATES).map((c) => c.key)) ok(issueKeys.has(key), `${key} is not a published key`);
}

// ── 7. rule 11 recomputed, and the vehicles refused on form ─────────────
// The pool screen is the artefact the next wave inherits, so its arithmetic is checked
// even though nothing was admitted off the back of it.
{
  const parse = (s) => {
    const m = String(s || "").match(/(\d+)\s*-\s*(\d+)/);
    if (!m) return null;
    const yea = +m[1], nay = +m[2];
    return { pool: yea + nay, losing: Math.min(yea, nay) };
  };
  let rule11 = 0, rule11Bad = 0;
  for (const r of decide.declinedRollCalls || []) {
    if (!/rule 11/i.test(String(r.why || ""))) continue;
    const t = parse(r.tally);
    if (!t) { rule11Bad++; failures.push(`a rule 11 refusal prints no tally: ${r.measure}`); continue; }
    rule11++;
    const pct = (t.losing / t.pool) * 100;
    if (pct >= 10) { rule11Bad++; failures.push(`${r.measure} is refused on rule 11 but its losing side is ${pct.toFixed(2)}% of the pool, which CLEARS the one-tenth bar`); }
    const printed = String(r.losingSide || "").match(/([\d.]+)\s*%/);
    if (printed && Math.abs(+printed[1] - pct) > 0.05) { rule11Bad++; failures.push(`${r.measure} prints ${printed[1]}% but the tally ${r.tally} gives ${pct.toFixed(2)}%`); }
  }
  ok(rule11 >= 19, `only ${rule11} refusals were checked against rule 11's arithmetic; the census claims 19 bills failed it`);
  eq(rule11Bad, 0, "a rule 11 refusal does not survive its own arithmetic");

  const c = decide._counts;
  const B = decide.census.questionB_alreadyIngestedUnmapped || {};
  eq(c.poolRefusedOnRule11, 19, "poolRefusedOnRule11");
  eq(c.poolRefusedOnForm, 7, "poolRefusedOnForm");
  eq(c.poolRefusedOnStandingDoctrine, 2, "poolRefusedOnStandingDoctrine — the two that survived everything else");
  eq(c.poolAdmitted, 0, "poolAdmitted");
  eq(c.poolRefusedOnRule11 + c.poolRefusedOnForm + c.poolRefusedOnKeyOrEvidence
    + c.poolRefusedOnStandingDoctrine + c.poolAdmitted, c.unmappedPoolSwept,
    "every measure in the swept pool must be accounted for — 19 + 7 + 5 + 2 + 0 = 33");
  ok(/19 \+ 7 \+ 5 \+ 2 = 33/.test(B.outcome || ""),
    "the pool screen must publish its own arithmetic, so a later reader can see that no measure fell out of the sweep unaccounted for");
  ok(!/\b2 ADMITTED\b/.test(JSON.stringify(decide.census)),
    "the census still describes two measures as admitted — the census narrative and the decision must not disagree about what happened");
  ok(/0 admitted/i.test(B.outcome || ""), "the pool screen must state that nothing was admitted");
  eq(c.unmappedPoolSwept, 33, "the unmapped pool");
  eq(c.unmappedPoolMemberVotes, 2903, "member votes carried by the unmapped pool");

  ok(/tightest in the pool/i.test(B.outcome || ""),
    "the form refusal must disclose that the refused vehicles had the tightest margins — refusing them on form while hiding that is refusing them on convenience");
  ok(/198-224/.test(B.outcome || "") && /210-209/.test(B.outcome || ""), "the two tightest vehicle margins must be printed");
  ok(/stowaway/i.test(B.outcome || ""), "the form refusal must cite the stowaway rule it is applying");
  const vehicles = (decide.declinedRollCalls || []).find((r) => /rules for the consideration/i.test(r.measure || ""));
  ok(!!vehicles, "the seven vehicles are not on the declined record with their roll count");
  ok(vehicles && /14 roll calls/.test(JSON.stringify(vehicles)), "the vehicle refusal does not state how many roll calls it covers");
  ok(vehicles && /Previous Question/i.test(JSON.stringify(vehicles)), "the vehicle refusal should name the question form (rule 8)");

  // The three measures blocked on evidence rather than merit, which is a different claim.
  eq((decide.blockedOn || []).length, 3, "the blocked-on-evidence list");
  for (const b of decide.blockedOn || []) {
    ok(String(b.evidence || "").length > 80, "a block must state what evidence is missing, not merely that something is missing");
    ok(String(b.whatWouldUnblockIt || "").length > 40, "a block must say what would unblock it");
  }
  // And the measured refusals: a candidate refused BECAUSE it cost reads.
  const measured = (decide.declinedMappings || []).filter((r) => /MEASURED/i.test(r.decision || ""));
  ok(measured.length >= 2, "the measured refusals — candidates refused because the harness showed them costing reads — are the brief's 'written block, not a mapping' and there should be more than one");
  const h245 = (decide.declinedMappings || []).find((r) => /H\.Amdt\. 245/.test(r.measure || ""));
  ok(h245 && /NINE|9 /.test(JSON.stringify(h245)), "the H.Amdt. 245 refusal does not state the nine rows it would have cost");
  ok(h245 && /rule 30/i.test(JSON.stringify(h245)), "the H.Amdt. 245 refusal does not name the mechanism that costs the rows");
}

// ── 8. floors, then the twin boot ──────────────────────────────────────
{
  const sh = R("stance-helpers.js");
  const FLOORS = { _RD_MIN_JUDGED: "4", _RD_MIN_PRIMARY: "1", _RD_THIN_MIN: "2", _RD_MIN_STRENGTH: "4", _RD_SPLIT_MIN_JUDGED: "6", _RD_SPLIT_MIN_SIDE: "2" };
  for (const [name, want] of Object.entries(FLOORS)) {
    const m = sh.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
    if (ok(!!m, `the ${name} literal is not in stance-helpers.js`)) eq(m[1], want, `${name} moved`);
  }
  const dom = sh.match(/_RD_DOMINANCE\s*=\s*([\d.]+)/);
  if (ok(!!dom, "the _RD_DOMINANCE literal is not in stance-helpers.js")) eq(dom[1], "0.75", "_RD_DOMINANCE moved");
  const mf = sh.match(/_PDX_RD_MEMBER_FLOOR\s*=\s*(\d+)/) || sh.match(/_RD_MEMBER_FLOOR\s*=\s*(\d+)/);
  if (ok(!!mf, "the member floor literal is not in stance-helpers.js")) eq(mf[1], "12", "the member floor moved");
}

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
  // NO BOOTED FILE MAY CHANGE AT ALL — with ONE structural exception, named here rather
  // than assumed. This section compares the working tree to HEAD, which was the whole
  // truth while F5 was the newest thing in the tree and stops being it the moment a LATER
  // wave ships a shipped-file change: F5's footprint is db/ and scripts/, but the diff
  // against HEAD is everyone's diff, not F5's. Federal wave F6 appends curated _DOS_MECH
  // prose to consistency.js for the eleven judged acts it creates, which runbook rule 33
  // requires of it, and that append would read here as F5 having edited the engine.
  //
  // So the exception is granted to ONE file, in ONE region, and is made to pay for
  // itself: outside _DOS_MECH consistency.js is byte-identical, the map is append-only,
  // and — the part that is actually about F5 — no appended entry may key on a measure F5
  // REFUSED. A mechanism line exists to explain a live judged mapping; one naming
  // H.R. 1069, H.R. 973 or the Boebert amendment would mean a later wave quietly took a
  // wall F5 argued and left standing, which is failure mode 4 arriving through the engine
  // instead of through a migration. Section 8's twin boot below is unwaived either way.
  const LATER_WAVE_WAIVER = {
    "consistency.js": "F6 appended eleven curated _DOS_MECH entries (rule 33)",
    // A roster wave admits people by writing identity rows into the roster, so forbidding the
    // roster file forbids the admission. federal_roster_r1_sep2026 adds 308 of them because
    // the House corpus held 7,298 recorded positions the fail-closed ingest had to skip for
    // want of a roster slug. The Direction Match sweep below still holds every profile HEAD
    // had bit-for-bit, which is what F5 — a wave that writes no row — actually needs.
    "cmp-data.js": "federal_roster_r1_sep2026 admitted 315 sitting House members as identity-only rows",
    // The person-file chrome pass (CACHE_VERSION v103), and both entries are SEAMS, not
    // licences: each file is still compared byte for byte everywhere outside one named
    // span, and what is inside the span is argued below rather than excused. Neither span
    // reads a floor, a band, a mapping, a weight or a score — which is the whole of what
    // F5 has at stake in these two files.
    "stance-helpers.js": "the mid-page record card stopped calling a record 'still being built' over acts it had not finished reading",
  };
  const F5_REFUSED = ["H.R. 1069", "H.R. 973", "H.R. 8800", "H.Amdt. 245"];
  let touched = [];
  for (const f of FILES) {
    const h = headSrc(f);
    if (h === null) continue;
    if (h !== nowSrc(f)) touched.push(f);
  }
  const stray = touched.filter((f) => !LATER_WAVE_WAIVER[f]);
  eq(stray.length, 0, `F5 changed a booted file (${stray.join(", ")}) — a wave that writes no row has no business editing the engine`);
  const has = (x, n, m2) => ok(String(x).includes(n), `${m2} — missing ${JSON.stringify(n)}`);
  if (touched.includes("stance-helpers.js")) {
    const sa = carveSeams(headSrc("stance-helpers.js"), SH_SEAMS, "HEAD", "stance-helpers.js", ok);
    const sb = carveSeams(nowSrc("stance-helpers.js"), SH_SEAMS, "now", "stance-helpers.js", ok);
    eq(sb.pinned, sa.pinned,
      "stance-helpers.js changed outside the record-CTA stats seam — the stance resolver the " +
      "whole profile is built from is not a chrome pass's to touch");
    assertStanceHelpersSeam(sb.bodies, { has, ok });
  }
  if (touched.includes("consistency.js")) {
    const A = "  var _DOS_MECH = {\n", B = "\n  };\n  // Fails closed in three places, on purpose:";
    const carve = (src, side) => {
      const i = src.indexOf(A), j = src.indexOf(B, i < 0 ? 0 : i);
      if (i < 0 || j <= i) { ok(false, `${side}: the mechanism map no longer reads as written in consistency.js`); return null; }
      ok(src.split(A).length === 2 && src.split(B).length === 2,
        `${side}: a mechanism-map anchor is no longer unique in consistency.js — widen it, do not loosen it`);
      return { pinned: src.slice(0, i + A.length) + src.slice(j), map: src.slice(i + A.length, j) };
    };
    const ca = carve(headSrc("consistency.js"), "HEAD"), cb = carve(nowSrc("consistency.js"), "now");
    if (ca && cb) {
      // Hashed rather than compared outright: a failure here should name the file, not
      // print a megabyte of engine into the log.
      const sha = (x) => createHash("sha256").update(x).digest("hex").slice(0, 16);
      // TWO MORE NAMED SEAMS, for the same reason the mechanism map has one. The
      // person-file chrome pass renamed the official scope's empty copy and split an
      // empty key list from an empty voting record in the ladder that chooses it.
      // Both spans are cut by anchors unique on both sides; the remainder is hashed
      // as before, and the spans are argued below.
      const va = carveSeams(ca.pinned, CJ_SEAMS, "HEAD", "consistency.js", ok);
      const vb = carveSeams(cb.pinned, CJ_SEAMS, "now", "consistency.js", ok);
      eq(sha(vb.pinned), sha(va.pinned),
        "consistency.js moved OUTSIDE the mechanism map and the two named v103 copy seams — the arithmetic, the floors and the bands are not any wave's to edit under this waiver");
      assertConsistencySeams(vb.bodies, { has, ok });
      ok(cb.map.startsWith(ca.map), "an existing mechanism entry was rewritten rather than appended to");
      const appended = cb.map.slice(ca.map.length);
      for (const num of F5_REFUSED)
        ok(!appended.includes(num),
          `a later wave appended mechanism prose naming ${num}, which F5 refused — a wall F5 argued was taken without saying so`);
    }
  }

  const head = boot(headSrc, "HEAD");
  const work = boot(nowSrc, "working");
  if (ok(!!(head && head.PDXWordAction && head.PDXWordAction.read), "the pre-wave engine booted from HEAD")
    && ok(!!(work && work.PDXWordAction && work.PDXWordAction.read), "the current engine booted")) {
    const PIDS = Object.keys(head.CMP_DATA || {});
    ok(PIDS.length > 100, `the roster booted (${PIDS.length} profiles)`);
    const nowPids = Object.keys(work.CMP_DATA || {});
    // The roster may grow for a later roster wave; it may never shrink, and nobody HEAD had
    // may vanish. Pinning the count would forbid every future admission.
    ok(nowPids.length >= PIDS.length, "the roster shrank");
    eq(PIDS.filter((p) => !work.CMP_DATA[p]).length, 0, "a profile HEAD had is gone from the roster");

    // ── THE ATTRIBUTION CEILING ────────────────────────────────────────
    // This wave attributes no vote, so the ceiling is not "did we guess a member" but
    // "does every member the projections NAME exist". The refused rows' disclosures name
    // 62 members, and a name that does not resolve is a member nobody can check.
    const cost = decide.measuredCostOfTheRefusedRows || {};
    const eff = cost.theEffectRule3Predicted || {};
    const pull = (blob) => {
      const m = String(blob || "").match(/(?:Named in full|The 38): ([^.]+)\./);
      return m ? m[1].split(",").map((x) => x.trim()).filter(Boolean) : [];
    };
    const g38 = pull((eff.gov_regulation_strong_to_mostly || {}).meaning);
    const g17 = pull((eff.public_schools_thin_to_split || {}).meaning);
    eq(g38.length, (eff.gov_regulation_strong_to_mostly || {}).rows, "the 38-member list disagrees with its own count");
    eq(g17.length, (eff.public_schools_thin_to_split || {}).rows, "the 17-member list disagrees with its own count");
    const dupes = (a) => a.filter((x, i) => a.indexOf(x) !== i);
    eq(dupes(g38).length + dupes(g17).length, 0, `a named list contains a duplicate: ${[...dupes(g38), ...dupes(g17)].join(", ")}`);
    const faces = ["lee", "curtis", "bmoore", "maloy", "kennedy", "owens"];
    const gained = ((cost.theSingleUnreadConversion || {}).gainedReads || []).map((x) => x.pid);
    const roster = new Set(PIDS);
    const allNamed = [...g38, ...g17, ...faces, ...gained];
    const unknown = allNamed.filter((p) => !roster.has(p));
    eq(unknown.length, 0, `the projections name ${unknown.length} member(s) who are not on the roster: ${unknown.join(", ")} — fail-closed attribution means every named member resolves`);
    ok(allNamed.length >= 60, `only ${allNamed.length} members were checked against the roster`);
    console.log(`      (attribution: ${allNamed.length} named members, all resolve on a ${PIDS.length}-profile roster)`);

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
    eq(dmBad, 0, "Direction Match drifted — F5 writes no row, changes no support_meaning and adds no position, so every DM input is the same object it was");

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
    console.log(`      (twin boot: ${dm} DM reads, ${scoped} scoped reads, ${rows} issue rows — all identical)`);
  }
}

// ── 9. no party string in anything this wave wrote ──────────────────────
// Nothing here reaches a reader, because nothing ships. Checked anyway, because the
// drafted rationales are kept for the next pass to inherit and a party string that
// survives in a draft is a party string that ships later.
{
  const PARTY = /\b(Republican|Democrat|Democratic|GOP|partisan|bipartisan|left-wing|right-wing|conservative|liberal)\b/i;
  for (const m of decide.measures || []) {
    for (const i of m.issues || []) {
      const draft = i._draftedRowKeptForTheNextPass || {};
      for (const [label, text] of [["why", i.why], ["draft rationale", draft.rationale], ["caveat", i.theCaveat], ["motive note", i.notMotiveMapping]]) {
        ok(!PARTY.test(String(text || "")),
          `${m.number}/${i.issueKey} ${label} names a party — the record explains a vote by the instrument, never by the member's side`);
      }
    }
  }
  const eff = (decide.measuredCostOfTheRefusedRows || {}).theEffectRule3Predicted || {};
  ok(!PARTY.test(String((eff.gov_regulation_strong_to_mostly || {}).meaning || "")),
    "the 38-member projection names a party — a uniform-record block moving one way is the sharpest temptation in this wave");
  ok(/Nothing in any rationale, any row or any rendered string names a party/.test(String(eff.noPartyPatternClaimed || "")),
    "the projection must state the no-party claim explicitly, because it is the claim a reader would most reasonably doubt");
  // The polarity caveat on the contested draft stays with the draft.
  const ps = (decide.measures || []).find((m) => m.number === "H.R. 1069");
  const cand = ps && (ps.issues || []).find((i) => i.issueKey === "public_schools");
  ok(cand && String(cand.theCaveat || "").length > 150,
    "H.R. 1069's polarity is contestable and its caveat must survive the refusal — the next pass inherits the objection along with the argument");
  ok(cand && /PROTECT Our Kids|short title/i.test(String(cand.theCaveat || "") + String(cand.notMotiveMapping || "")),
    "the caveat should point at the bill's own short title, which is where a reader sees the motive");
}

// ── report ────────────────────────────────────────────────────────────
console.log(`\n  test-vr-federal-wave-f5 — ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
  if (failures.length > 60) console.log(`   … and ${failures.length - 60} more`);
  console.log("");
  process.exit(1);
}
const c = decide._counts;
console.log(`  F5: NOTHING SHIPPED, on purpose · ${c.unmappedPoolSwept} unmapped measures swept (${c.poolRefusedOnRule11} rule 11, `
  + `${c.poolRefusedOnForm} form, ${c.poolRefusedOnKeyOrEvidence} key/evidence, ${c.poolAdmitted} admitted) · `
  + `${c.candidatePromotesSimulated} Senate promotes simulated, all +0/-0 · ${c.standingWallsFound} standing walls found and quoted · `
  + `${c.rowsDraftedAndRefusedAsDoctrineReversals} drafted rows refused as declined reversals, kept with their measured cost · `
  + `keysAdded ${c.keysAdded} · floors unmoved · not one row or key written, and no engine byte outside `
  + `the mechanism prose a later wave appends for its own acts\n`);
