#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-federal-wave-f11.mjs — first acts on empty poled keys
// ─────────────────────────────────────────────────────────────────────────────
// F11 is a COVERAGE wave. F10 closed the chamber-gap and PRIMARY-promote hunt at
// zero — is_primary is a label, _rdLeanAllowed() already returns true on any key
// holding a floor act, and F10 measured every promotable act in the corpus at
// +0/-0. What was left is keys with no ACT at all. So this suite's job is not
// "did a flag flip" but "did two keys that read empty for every member of Congress
// start reading, for exactly the people who cast a side and nobody else".
//
// Six things are pinned, and two of them are unusual.
//
//   1. THE ADMIT CONDITIONS, all of them, per admit: the key is empty in that
//      chamber, has a curated directional pole, the instrument is standalone
//      policy, a roll exists, attribution is at or under the chamber headcount,
//      Present/NV carry no direction, polarity and weight are argued from the
//      text. A seed that admits without one of those is not a seed.
//
//   2. THE REFUSALS ARE COMPLETE. Every poled key left empty after this wave has
//      to appear in the seed's refusal list with a measured reason. A coverage
//      wave that fills two keys and quietly forgets the other twenty has not
//      measured coverage, it has picked two bills. Banned reasons are checked for
//      too: no party-line reason, no "would fill the pattern", no new *_balance
//      pole, and F10's four title traps stay refused by name.
//
//   3. THE PROJECTED MOVEMENT, against the real engine and the real corpus. The
//      brief asks for a twin boot of Direction Match and formal rows against
//      pre-F11 "except the keys this wave filled". The shipped client engine reads
//      cmp-data.js, not the database, so a HEAD-versus-working-tree boot can only
//      prove that nothing shipped moved — which is section 5 and is worth having,
//      but is not the movement. The movement lives in the FPI's own before/after
//      pair, which IS a twin: the same engine booted twice, once over the live
//      corpus and once over the live corpus plus this wave's seeds. Section 6
//      requires gainedReads to be exactly the two filled keys plus family_support
//      collateral, lostReads to be empty, and every gained row to land at thin or
//      stronger.
//
//   4. THE MUTATION, and this is the one that would be easy to fake. Drop the one
//      admitted mapping row and the 195 members who gained a housing_support read
//      must return to empty on that key — not to a different tier, not to unread
//      with a reason, to ABSENT. It is run through a real FPI invocation against a
//      one-row-lighter seed via --seed-override, a flag added for exactly this and
//      documented in the harness as the alternative to F8's rewrite-the-file-on-
//      disk pattern. Nothing is mutated on disk by this suite. See section 7.
//
//   5. THE SEQUENTIAL AUDIT RULE (runbook rule 47). Wave F8's identity walls
//      rename a roster row in cmp-data.js on disk and restore it in a finally.
//      Every twin-boot suite here reads the working copy from disk, so one booting
//      inside that window reports a person who vanished and blames the record.
//      Section 5 refuses to compare a tree carrying F8's marker, reports arrivals
//      alongside departures so the two causes are distinguishable, and keeps both
//      trees' exceptions rather than swallowing them in a bare catch.
//
//   6. THE PACK. Rows are written, so mappingVersion() must move. The start and
//      end values are both recorded in the seed and the end one is COMPUTED, not
//      hand-waved, so section 8 can check the live table against it.
//
// The FPI sections need NETLIFY_DB_URL and take a few minutes. They SKIP loudly
// when it is absent rather than passing quietly, because a coverage claim that
// cannot be measured has not been checked.
//
//   node scripts/test-vr-federal-wave-f11.mjs
//
// Exit code is non-zero on the first failure so it can gate CI.
// RUN THE WAVE AUDITS ONE AT A TIME.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const skips = [];
const ok = (cond, msg) => { if (cond) { passed++; return true; } failures.push(msg); return false; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const MAP_SEED = "db/vr-federal-mapping-seed-f11.json";
const VOTE_SEED = "db/vr-federal-wave-f11-vote-seed.json";
const MIG = "netlify/database/migrations/20261028000000_vr_federal_wave_f11.sql";
const decide = J(MAP_SEED);
const votes = J(VOTE_SEED);
const vote = (votes.votes || [votes])[0];
const C = decide._counts || {};
const SQL = existsSync(join(ROOT, MIG)) ? R(MIG) : "";

// ── 0. the poled set, read from the engine rather than restated ─────────
// Every claim in this suite about a key being "poled" has to come from
// stance-helpers.js, because that is the file that decides. _RD_NO_POLE is an
// OBJECT LITERAL and not a Set — a detail worth pinning, since treating it as a
// Set is a silent no-op that would make every suppressed key look poled and let
// this wave admit onto one.
const SH = R("stance-helpers.js");
const NO_POLE = (() => {
  const blk = SH.match(/_RD_NO_POLE\s*=\s*\{([\s\S]*?)\n\s*\};/);
  if (!blk) return null;
  return new Set([...blk[1].matchAll(/^\s*([a-z_]+)\s*:/gm)].map((m) => m[1]));
})();
{
  ok(NO_POLE && NO_POLE.size >= 13, `_RD_NO_POLE parsed from stance-helpers.js (${NO_POLE ? NO_POLE.size : 0} keys)`);
  ok(/_RD_NO_POLE\s*=\s*\{/.test(SH), "_RD_NO_POLE is still an object literal — a Set membership test against an object is a silent no-op and would make every poleless key look poled");
  ok(/_balance\$/.test(SH) || /_balance\$\/\.test/.test(SH), "the /_balance$/ suppression is still in stance-helpers.js — this wave's whole doctrine claim rests on it");
  // Suppression precedes every wall, weight, lane and chamber check. If it stops
  // doing so, a *_balance row like H.R. 7567's enviro_balance starts publishing and
  // this wave shipped a reading it explicitly declined to make.
  const sup = SH.match(/function _rdSuppressedKey[\s\S]{0,600}/);
  ok(!!sup && /no_issue/.test(sup[0]) && /balance_key/.test(sup[0]) && /no_pole/.test(sup[0]),
    "_rdSuppressedKey() still returns no_issue / balance_key / no_pole");
  // The floors this wave does not touch.
  for (const [name, want] of [["_RD_MIN_JUDGED", "4"], ["_RD_THIN_MIN", "2"], ["_RD_THIN_MIN_STRENGTH", "0.6"], ["_RD_MIN_PRIMARY", "1"]]) {
    const m = SH.match(new RegExp(`${name}\\s*=\\s*([0-9.]+)`));
    eq(m && m[1], want, `${name} moved — F11 is a coverage wave and moves no floor`);
  }
  ok(/if\s*\(\s*idx\.floorActs\s*>\s*0\s*\)\s*return true;/.test(SH),
    "_rdLeanAllowed() still short-circuits on floorActs > 0 — this is the whole mechanism by which ONE act fills a key, and without it both admits buy nothing");
}

// ── 1. the seed is decided, and its counts reconcile against itself ─────
{
  eq(decide._status, "DECIDED", "the mapping seed must ship DECIDED");
  const adds = (decide.measures || []).flatMap((m) => (m.issues || []).map((i) => ({ ...i, number: m.number })));
  eq(adds.length, C.mappingRowsAdded, "measures[].issues[] does not match _counts.mappingRowsAdded");
  eq((decide.retractions || []).length, C.mappingRowsRetracted, "retractions[] does not match _counts.mappingRowsRetracted");
  eq((decide.statusCorrections || []).length, C.statusCorrections, "statusCorrections[] does not match _counts");
  eq((decide.promotes || []).length, 0, "F11 promotes nothing — F10 proved a promote moves a label and no read");
  eq(C.newIssueKeys, 0, "F11 adds no issue key");
  eq(C.newPoles, 0, "F11 adds no pole");
  eq((decide.vocab || {}).newBalancePolesProposed, 0, "no new *_balance pole may be proposed");
  eq(C.mappingRowsBefore - C.mappingRowsRetracted + C.mappingRowsAdded, C.mappingRowsAfter,
    "before - retracted + added must equal after, or the row arithmetic is wrong somewhere");
  // Every row that carries a decision has to be DECIDED: the overlay ignores
  // UNDECIDED rows rather than counting them, so an UNDECIDED row in a shipped
  // seed is a row that reads as admitted in the prose and as nothing in the table.
  for (const a of adds) eq(a.decision, "DECIDED", `${a.number} ${a.issueKey} is not DECIDED`);
  for (const r of decide.retractions || []) eq(r.decision, "RETRACTED", `${r.number} ${r.issueKey} retraction is not marked RETRACTED`);
  eq(C.keysFilled, 2, "_counts.keysFilled");
  eq(C.actsAdmitted, 1, "_counts.actsAdmitted — one instrument, one act");
  eq(C.votesIngested, 1, "_counts.votesIngested");
  eq(C.memberVotesIngested, vote.memberVotes.length, "_counts.memberVotesIngested does not match the vote seed");
}

// ── 2. every admit clears every admit condition ─────────────────────────
{
  const admitted = decide.admitted || [];
  ok(admitted.length >= 2, `the seed names its admits (${admitted.length})`);
  const FILLED = new Set();
  for (const a of admitted) {
    const tag = `${a.id} (${a.fillsKey})`;
    // a pole, and a real one
    ok(!!a.fillsKey, `${tag}: names the key it fills`);
    ok(NO_POLE && !NO_POLE.has(a.fillsKey), `${tag}: ${a.fillsKey} must not be in _RD_NO_POLE — a poleless key stays unread by doctrine`);
    ok(!/_balance$/.test(a.fillsKey), `${tag}: ${a.fillsKey} must not be a *_balance key`);
    FILLED.add(a.fillsKey);
    // the key was empty
    ok(/empty/i.test(String(a.keyStateBefore || "")), `${tag}: must state the key was empty before`);
    // standalone policy, and the refused vehicle list named rather than implied
    const stand = String(a.instrumentIsStandalonePolicy || a.whyTheActAlreadyExists || "");
    ok(/continuing resolution|special rule|suspend|passage|NDAA|discharge/i.test(stand),
      `${tag}: must argue the instrument is standalone policy against the vehicle list the brief refuses`);
    // text read from the chamber, not the short title
    const txt = a.textReadFromTheChamber || {};
    ok(/govinfo\.gov/.test(String(txt.print || "")), `${tag}: the print must be a govinfo chamber text, not a summary`);
    ok(!!(txt.operativeSections || txt.titles), `${tag}: must quote operative sections or titles from that print`);
    ok(/Sec\.|SEC\.|Title|TITLE|I |II /.test(JSON.stringify(txt)), `${tag}: the text argument must cite sections or titles`);
    // polarity and weight argued from the text
    ok(/yea_supports|yea_opposes/.test(String(a.polarityFromTheText || "")), `${tag}: polarity must be argued and named`);
    ok(String(a.polarityFromTheText || "").length > 120, `${tag}: the polarity argument is too short to be an argument`);
    ok(/w\d|weight/i.test(String(a.weightEarnedByTheText || "")), `${tag}: weight must be argued from the text`);
    // no invented stance, no LLM summary, no party reason
    ok(!/summar(y|ise|ize)d by|language model|LLM|GPT|Claude/i.test(JSON.stringify(a)), `${tag}: no machine-written bill summary may appear in an admit`);
  }
  eq(FILLED.size, 2, "exactly two keys are filled");
  ok(FILLED.has("rural_ag") && FILLED.has("housing_support"), "the filled keys are rural_ag and housing_support");

  // The act admit must have a roll AND the key must have a PRIMARY to read.
  const act = admitted.find((a) => a.kind === "act");
  ok(!!act, "one admit is an ACT");
  const att = (act || {}).attribution || {};
  eq(att.chamberRecorded, vote.memberVotes.length, "the act's attribution block must match the vote seed's recorded count");
  eq(att.unresolved, 0, "no recorded member may be unresolved — attribution is fail-closed, and a skipped member is a member with no record of their own vote");
  ok(/w100 PRIMARY/.test(String(act.weightEarnedByTheText || "")), "the act's key must hold a PRIMARY for the act to read");
  // The mapping admit must land on a measure that already has passage-form acts.
  const mapAdmit = admitted.find((a) => a.kind === "mapping");
  ok(!!mapAdmit, "one admit is a MAPPING onto acts already on file");
  ok(/passage/i.test(String(mapAdmit.whyTheActAlreadyExists || "")), "the mapping admit must show its measure's rolls are passage-form");
  eq(mapAdmit.isPrimary, false, "the mapping admit is secondary — its measure already holds two PRIMARYs on the supply lane and this is a different lane, not a second reading of the same one");
  ok(/[Nn]ot [Rr]estuffing|notRestuffing/.test(JSON.stringify(mapAdmit)) && String(mapAdmit.notRestuffing || "").length > 200,
    "the mapping admit must argue it is not restuffing a subject that already has siblings at secondary");
}

// ── 3. attribution ceiling, and no direction on a no-side vote ──────────
{
  const mv = vote.memberVotes || [];
  eq(mv.length, vote._chamberRecorded, "memberVotes length must equal the recorded count");
  ok(mv.length <= 435, `attribution ${mv.length} must not exceed the House headcount of 435`);
  const sides = mv.filter((m) => m.position === "yea" || m.position === "nay");
  eq(sides.length, vote._attributedSides, "_attributedSides must equal the yea+nay rows");
  eq(sides.length, vote.totals.yea + vote.totals.nay, "the attributed sides must equal the clerk's own yea+nay");
  ok(sides.length <= vote._poolYeaNay, `attributed sides ${sides.length} must not exceed the pool of ${vote._poolYeaNay}`);
  eq(mv.length - new Set(mv.map((m) => m.politicianId)).size, 0, "a member may appear once on a roll");
  const noSide = mv.filter((m) => m.position === "present" || m.position === "not_voting");
  eq(noSide.filter((m) => m.isParty !== null).length, 0,
    "Present and Not Voting must carry isParty null — a no-side vote is never a direction, in either direction");
  eq(noSide.length, vote.totals.present + vote.totals.notVoting, "the no-side rows must equal the clerk's present+notVoting");
  for (const m of mv) ok(/^(yea|nay|present|not_voting)$/.test(m.position), `unrecognised position '${m.position}' for ${m.politicianId}`);
  // The party tallies were cross-checked against the clerk's own block by the
  // generator; check the arithmetic closes here too, because a seed is the last
  // artifact anyone reads.
  const pt = vote.partyTotals || {};
  const sum = (f) => Object.values(pt).reduce((a, t) => a + (t[f] || 0), 0);
  eq(sum("yea"), vote.totals.yea, "party yea totals do not sum to the chamber yea total");
  eq(sum("nay"), vote.totals.nay, "party nay totals do not sum to the chamber nay total");
  eq(sum("notVoting"), vote.totals.notVoting, "party notVoting totals do not sum to the chamber total");
  ok(/clerk\.house\.gov/.test(String(vote.xmlUrl || "")) && /clerk\.house\.gov/.test(String(vote.sourceUrl || "")),
    "the roll must be sourced from the Clerk's own XML, not from a secondary tally");
  ok(/passage/i.test(String(vote.actionType)) && /On Passage/i.test(String(vote.question)),
    "the admitted question must be passage-form");
}

// ── 4. the refusals are complete, and none of them is a banned reason ───
{
  const ref = decide.refusals || [];
  eq(ref.length, C.keysRefused, "refusals[] does not match _counts.keysRefused");
  const byKey = new Map(ref.map((r) => [r.issueKey, r]));
  const cen = decide.census || {};
  const B = cen.metricB_noFederalAct || {};
  // EVERY leftover empty poled key must be refused in writing.
  const leftover = [...(B.afterNoneAnywhereKeys || []), ...(B.noHouseActKeys || [])];
  ok(leftover.length > 0, "the census must enumerate the keys still empty after this wave");
  for (const k of leftover) {
    const r = byKey.get(k);
    if (!ok(!!r, `${k} is still empty after this wave and carries no written refusal — "the leftover list" is not optional`)) continue;
    ok(String(r.why || "").length > 120, `${k}: the refusal is too short to be a reason`);
    ok(!!r.measured && /\d/.test(String(r.measured)), `${k}: the refusal must carry a MEASURED figure, not an assertion`);
    ok(!!r.blockedOn, `${k}: the refusal must price what would unblock it`);
  }
  eq(B.afterNoneAnywhere, (B.afterNoneAnywhereKeys || []).length, "the after-census count does not match its own key list");
  eq(B.beforeNoneAnywhere, (B.beforeNoneAnywhereKeys || []).length, "the before-census count does not match its own key list");
  eq(B.beforeNoneAnywhere - B.afterNoneAnywhere, 2, "two keys must leave the no-act-anywhere group, one per filled key");
  for (const k of ["rural_ag", "housing_support"]) {
    ok((B.beforeNoneAnywhereKeys || []).includes(k), `${k} must be in the BEFORE empty list, or it was not empty and this wave filled nothing`);
    ok(!(B.afterNoneAnywhereKeys || []).includes(k), `${k} must be out of the AFTER empty list`);
  }
  // A refused key must not also be a filled key, and a refused key must be poled.
  for (const r of ref) {
    ok(NO_POLE && !NO_POLE.has(r.issueKey), `${r.issueKey} is in _RD_NO_POLE and has no business in a poled-key refusal list`);
    ok(!/_balance$/.test(r.issueKey), `${r.issueKey} is a *_balance key and has no business in this list`);
  }
  // BANNED REASONS. "Would fill the pattern" and any party-line justification.
  const allRefusalText = JSON.stringify(ref);
  // The seed is allowed — encouraged — to NAME pattern-filling as the thing it
  // refuses. So the test is not "the phrase is absent" but "every occurrence of it
  // is immediately disowned". Anything else is a refusal that rests on it.
  for (const m of allRefusalText.matchAll(/(fill the pattern|complete the pattern|for symmetry|to round out)(.{0,60})/gi)) {
    ok(/^.{0,4}\s*is not a reason|^.{0,4}\s*was not a reason|is not offered/i.test(m[2]),
      `a refusal appears to rest on pattern-filling rather than disowning it: "…${m[1]}${m[2]}"`);
  }
  ok(!/\b(Republicans?|Democrats?) (voted|opposed|supported|would)\b/i.test(allRefusalText),
    "no refusal may rest on who voted for it — a party-line reason is not a reason");
  ok(!/party.line/i.test(allRefusalText) || /no party.line reason/i.test(JSON.stringify(decide._doctrine || [])),
    "party-line reasoning appears in a refusal");
  // Rule 42: a _RD_NO_POLE key's absence of a pole must never be the FIRST reason.
  for (const r of ref) {
    const w = String(r.why || "");
    const first = w.slice(0, Math.max(0, w.length / 2));
    ok(!/no pole|_RD_NO_POLE|holds at no pole/i.test(first) || /stated second|after the textual reason/i.test(w),
      `${r.issueKey}: the no-pole fact must never be the first reason a roll is declined (runbook rule 42)`);
  }
  // F10's four title traps stay refused, and are named rather than assumed.
  const traps = /weatheriz/i.test(SQL + allRefusalText) && /SWAP/i.test(SQL) && /SPACE/i.test(SQL) && /sunset pilot/i.test(SQL + allRefusalText);
  ok(traps, "F10's four title traps must be named as still refused — weatherization that weatherizes nothing, SWAPs as wildlife plans, SPACE as office space, a screening mandate that is a sunset pilot");
  // And F11's own title trap: housing_first_time refused on permissive pilots.
  const hft = byKey.get("housing_first_time");
  ok(!!hft && /may establish|pilot|PILOT/i.test(String(hft.why)),
    "housing_first_time must be refused on the permissive-pilot text, not omitted — it is the same print that earns housing_support and the easy symmetry was available");
  ok(/Sec\. 105/.test(String((hft || {}).why)) && /Sec\. 404/.test(String((hft || {}).why)),
    "the housing_first_time refusal must cite the specific sections it read");
  // Rule 43 both ways is this wave's finding and must be on the record.
  ok((decide._findings || []).some((f) => /both ways|BOTH DIRECTIONS|cuts in both/i.test(f) && /43/.test(f)),
    "the seed must record that rule 43 cut in both directions on one print, or the next curator re-learns it");
  // The vocabulary proposal was documented and refused, not acted on.
  const v = decide.vocab || {};
  eq(v.newKeysAdmitted, 0, "no new issue key may be admitted");
  ok(!!(v.observationForALaterWave || {}).notActedOn, "a vocabulary observation must be documented AND refused, in that order");
}

// ── 5. nothing shipped moved — twin boot, HEAD vs working tree ──────────
// F11's whole footprint is db/, scripts/ and one migration. So the strict form of
// this check is available: boot both trees and require every Direction Match read
// and every formal-pattern row identical. A later wave's shipped-file change would
// surface here as a stray, which is correct — it means the comparison is no longer
// about F11 and a waiver has to be written down before it is granted.
{
  const FILES = [
    "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "consistency.js", "voting-record.js", "word-action.js",
  ];
  const nowSrc = (f) => readFileSync(join(ROOT, f), "utf8");
  const headSrc = (f) => {
    try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
    catch { return null; }
  };
  const touched = FILES.filter((f) => { const h = headSrc(f); return h !== null && h !== nowSrc(f); });
  eq(touched.length, 0, `F11 changed a booted engine file (${touched.join(", ")}) — a coverage wave writes mapping rows and no engine`);

  // RUNBOOK RULE 47. scripts/test-vr-federal-wave-f8.mjs rewrites cmp-data.js on
  // disk for its identity walls and restores it in a finally. Every twin-boot suite
  // here reads the working copy from disk, so one booting inside that window sees a
  // renamed roster row and reports a person who vanished. Refuse to compare, and say
  // which suite and why.
  const MUTATION_MARKER = "_FOR_THIS_MUTATION";
  const midMutation = FILES.filter((f) => nowSrc(f).includes(MUTATION_MARKER));
  ok(midMutation.length === 0,
    `${midMutation.join(", ")} carries a test harness's mutation marker (${MUTATION_MARKER}), so another audit has the `
    + `working copy rewritten on disk right now — scripts/test-vr-federal-wave-f8.mjs renames a roster row for its `
    + `identity walls and restores it in a finally. Nothing below this line would be a comparison. RUN THE WAVE `
    + `AUDITS SEQUENTIALLY, not in parallel.`);

  // Both trees may throw — a sandbox is not a browser — but they must throw the SAME
  // things. A bare catch here makes a half-booted sandbox indistinguishable from a
  // real regression, which is the mistake this comment exists to prevent repeating.
  function boot(get, label) {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    const errs = [];
    for (const f of FILES) {
      const src = get(f);
      if (src === null) return null;
      try { vm.runInContext(src, ctx, { filename: `${label}:${f}` }); }
      catch (e) { errs.push(`${f}: ${e && e.message}`); }
    }
    win.__bootErrs = errs;
    return win;
  }
  const head = boot(headSrc, "HEAD"), work = boot(nowSrc, "now");
  if (head && work) {
    const he = (head.__bootErrs || []).join("\n"), we = (work.__bootErrs || []).join("\n");
    ok(he === we, `the two trees did not boot the same way, so nothing compared below is a comparison. This is usually `
      + `several audits running at once rather than a real divergence — rerun this suite alone before believing it.`
      + `\n      HEAD threw: ${he || "(nothing)"}\n      working threw: ${we || "(nothing)"}`);
  }
  if (ok(!!head && !!work, "the twin boot loaded both trees")) {
    const PIDS = Object.keys(head.CMP_DATA || {});
    const NOW_PIDS = Object.keys(work.CMP_DATA || {});
    ok(PIDS.length > 100, `the booted roster is wide enough to mean something (${PIDS.length} profiles)`);
    const missing = PIDS.filter((p) => !work.CMP_DATA[p]);
    const arrivals = NOW_PIDS.filter((p) => !head.CMP_DATA[p]);
    ok(missing.length === 0,
      `${missing.length} profile(s) HEAD had are absent from the working tree's boot (${missing.slice(0, 5).join(", ")}) — `
      + `F11 touches no file the roster is built from, so this is almost certainly not a roster regression. HEAD booted `
      + `${PIDS.length} profiles with ${(head.__bootErrs || []).length} exception(s); the working tree booted ${NOW_PIDS.length} `
      + `with ${(work.__bootErrs || []).length}. Keys present only in the working tree: `
      + `${arrivals.length ? arrivals.slice(0, 5).join(", ") : "(none)"}. Equal counts plus a renamed twin in that list means `
      + `another audit rewrote the file while this one read it — rerun alone. Unequal counts mean a boot did not finish.`);
    let dm = 0, dmBad = 0;
    for (const pid of PIDS) {
      let a = null, b = null;
      try { a = head.PDXWordAction.read(pid); } catch { continue; }
      try { b = work.PDXWordAction.read(pid); } catch { b = null; }
      if (!a) continue;
      if (!b) { dmBad++; failures.push(`${pid}: Direction Match stopped returning`); continue; }
      dm++;
      for (const k of ["pct", "publishable", "word", "testedWeight"]) {
        if (b[k] !== a[k]) { dmBad++; failures.push(`${pid}: DM ${k} moved — ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`); }
      }
    }
    ok(dm > 100, `the Direction Match sweep was wide enough to mean something (${dm} profiles)`);
    eq(dmBad, 0, "Direction Match drifted — F11 writes mapping rows to the database and changes no shipped stance file, so every DM input is the same object it was");
    let rows = 0, rowBad = 0;
    const tiers = new Map();
    for (const pid of PIDS) {
      let ra = [], rb = [];
      try { ra = head.PDXConsistency.issueRows(pid) || []; } catch { continue; }
      try { rb = work.PDXConsistency.issueRows(pid) || []; } catch { rb = []; }
      if (rb.map((r) => r.key).join("|") !== ra.map((r) => r.key).join("|")) { rowBad++; failures.push(`${pid}: the issue-row list changed`); }
      const byKey = {};
      for (const r of rb) byKey[r.key] = r;
      for (const r of ra) {
        const q = byKey[r.key];
        if (!q) continue;
        rows++;
        let sa = null, sb = null;
        try { sa = head.PDXConsistency.rowResult(r); } catch { sa = { __err: 1 }; }
        try { sb = work.PDXConsistency.rowResult(q); } catch { sb = { __err: 1 }; }
        if (!sa || !sb) continue;
        for (const k of ["state", "metric", "pct"]) if (sb[k] !== sa[k]) { rowBad++; failures.push(`${pid}/${r.key}: row ${k} moved`); }
        if ((q.verdict || {}).token !== (r.verdict || {}).token) { rowBad++; failures.push(`${pid}/${r.key}: the verdict moved`); }
        if (sa.state) tiers.set(sa.state, (tiers.get(sa.state) || 0) + 1);
      }
    }
    ok(rows > 500, `the issue-row sweep was wide enough to mean something (${rows} rows)`);
    eq(rowBad, 0, "a formal pattern tier drifted");
    ok(tiers.size >= 2, "the tier sweep saw more than one tier, or it was not actually reading tiers");
    console.log(`      (twin boot: ${dm} DM reads, ${rows} issue rows, ${tiers.size} distinct tiers — all identical to HEAD)`);
  }
}

const FPI = "scripts/vr-federal-fpi.mjs";

// ── 5a. --reach: what it can say, and what it cannot ───────────────────
// The brief asks for `--reach` on the poled empty keys. Running it twice, once
// without this wave and once with it, produced output identical except the two
// header lines naming the wave list — so the flag cannot be used as evidence that
// F11 shipped anything, and the seed records why as a finding rather than quoting
// the table as a result. Two things are pinned here instead.
//
// First, the CAUSE, asserted against the source, because it is the whole basis of
// that finding: the --reach branch prices the corpus as it stands and never looks
// at the projected wave. If someone later wires `after` into it, this assertion
// fails, the finding stops being true, and it should be rewritten rather than
// carried forward as folklore.
//
// Second, the two things --reach CAN honestly say — the attribution ceiling holds
// at chamber headcount, and every key with unread volume and a ceiling of zero is
// structurally suppressed rather than merely uncurated. Those need the live corpus
// and about ten minutes for the two chambers' simulations, so the run is opt-in:
// pass --reach to this suite. Skipped is reported as skipped, never as passed.
{
  const src = R(FPI);
  const at = src.indexOf('process.argv.includes("--reach")');
  const end = src.indexOf("} else if", at + 10);
  const branch = at > 0 ? src.slice(at, end > at ? end : at + 12000) : "";
  ok(branch.length > 2000, "the --reach branch was located in the census tool");
  ok(/whyRows\(winB, before, pids\)/.test(branch),
    "--reach no longer prices the corpus as it stands (winB/before) — if it now reads the projected wave, the seed's finding that its output is identical before and after F11 is stale and must be rewritten, not carried forward");
  ok(!/\bafter\b/.test(branch.replace(/\/\/[^\n]*/g, "")),
    "the --reach branch now references `after`, so it can see a wave's own projection and the finding recording that it cannot is out of date");
  ok((decide._findings || []).some((f) => /--reach IS A PRE-WAVE INSTRUMENT/.test(f)),
    "the seed must record that --reach cannot measure the wave that passes it, or the next curator quotes its table as a result");
  const ra = (decide.census || {}).reachAfterState || {};
  ok(/holds at chamber headcount/.test(String(ra.attributionCeiling || "")), "the seed must record the measured attribution ceiling from the after-state run");
  ok(/byte-identical/.test(String(ra.identicalToBefore || "")), "the seed must record the before/after identity plainly");

  if (!process.argv.includes("--reach")) {
    skips.push("the --reach re-run is opt-in (about ten minutes for both chambers): rerun with --reach to re-measure the attribution ceiling and the zero-ceiling key set live");
  } else if (!process.env.NETLIFY_DB_URL) {
    skips.push("--reach was requested but NETLIFY_DB_URL is absent, so the ceiling was NOT re-measured");
  } else {
    let out = "";
    try {
      out = execFileSync(process.execPath, [join(ROOT, FPI), "--set", "all", "--waves", "f1,f2,f3,f4,f10,f11", "--reach"],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 30 * 60 * 1000, stdio: ["ignore", "pipe", "ignore"] });
    } catch (e) { failures.push(`--reach would not run: ${e && e.message}`); }
    if (out) {
      const ceilings = [...out.matchAll(/attribution ceiling holds at chamber headcount on every key: (\w+) \((\d+) (\w+) members, max attributed (\d+)\)/g)];
      eq(ceilings.length, 2, "--reach must report an attribution ceiling for both chambers");
      for (const c of ceilings) {
        eq(c[1], "yes", `the attribution ceiling does not hold in the ${c[3]} — a synthetic instrument with every member Yea must never exceed the chamber headcount`);
        eq(c[4], c[2], `the ${c[3]} max attributed (${c[4]}) is not the chamber headcount (${c[2]})`);
      }
      const zero = [...out.matchAll(/KEYS WITH UNREAD VOLUME AND A CEILING OF ZERO: (\d+)\s+\((\d+) of them structurally suppressed/g)];
      eq(zero.length, 2, "--reach must report the zero-ceiling set for both chambers");
      for (const z of zero) eq(z[2], z[1],
        `a key with unread volume and a ceiling of zero is NOT structurally suppressed — that would be a poled key no instrument can reach, which is a coverage hole rather than doctrine, and this wave would have to price it`);
      // rural_ag and housing_support still print unread 0 with a whole-chamber
      // ceiling after the wave. That is the finding, stated as an assertion so it
      // stops being a claim.
      for (const k of ["rural_ag", "housing_support"]) {
        const rows = [...out.matchAll(new RegExp(`^\\s+${k}\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)`, "gm"))];
        ok(rows.length === 2, `${k} must still appear in both chambers' reach tables`);
        for (const r of rows) eq(r[2], "0", `${k}: --reach reports ${r[2]} unread rows — the wave created READS, not unread rows, and reach counts the latter`);
      }
    }
  }
}

// ── 6/7. the projected movement, and the mutation ───────────────────────
// The FPI is the twin that can see this wave: the same engine booted twice, once
// over the live corpus and once over the live corpus plus F11's seeds. Its
// gainedReads / lostReads are (member, key) sets on the row model's own `read`
// flag, which is the only form of the promise that survives a counter netting out.
const runFpi = (extra) => {
  const out = execFileSync(process.execPath, [join(ROOT, FPI), "--set", "all", "--waves", "f1,f2,f3,f4,f10,f11", "--json", ...extra],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: 20 * 60 * 1000, stdio: ["ignore", "pipe", "ignore"] });
  const at = out.indexOf("{");
  return JSON.parse(out.slice(at));
};
if (!process.env.NETLIFY_DB_URL) {
  skips.push("sections 6-8 need NETLIFY_DB_URL — the coverage claim is a measurement and was NOT checked in this run");
} else {
  let base = null;
  try { base = runFpi([]); }
  catch (e) { failures.push(`the FPI projection would not run, so this wave's coverage claim is unverified: ${e && e.message}`); }

  if (base) {
    // ── 6. the two filled keys move, and nothing else loses a read ──────
    eq(base.seed.added, C.mappingRowsAdded, "the FPI overlaid a different number of rows than the seed claims");
    eq(base.seed.retracted, C.mappingRowsRetracted, "the FPI retracted a different number of rows than the seed claims");
    eq(base.voteSeed.rolls, 1, "the vote seed must project exactly one roll call");
    eq(base.voteSeed.memberVotes, vote.memberVotes.length, "the vote seed must project every attributed member vote");
    eq(base.voteSeed.measures, 0, "F11 creates no measure — both of its bills were already in the corpus");

    // THE RETRACTIONS COST ZERO READS. Both retraction notes claim it; this is where
    // the claim is measured. A retraction that took a read would be a wave that made
    // the record worse while filing a coverage report.
    eq((base.lostReads || []).length, 0,
      `rows stopped being characterised: ${(base.lostReads || []).slice(0, 8).map((r) => `${r.pid}/${r.key}`).join(", ")} — `
      + `the retractions are argued as costing zero existing reads and must actually cost zero`);
    eq(C.fpiRowsStoppedCharacterised, 0, "the seed must record the measured zero as zero");

    const gained = base.gainedReads || [];
    const byKey = new Map();
    for (const g of gained) { const l = byKey.get(g.key) || []; l.push(g); byKey.set(g.key, l); }
    eq(gained.length, C.fpiRowsStartedCharacterised, "the seed's recorded gained-read figure does not match the measurement");

    // Exactly the two filled keys plus the disclosed family_support collateral.
    const expectedKeys = new Set(["rural_ag", "housing_support", "family_support"]);
    const stray = [...byKey.keys()].filter((k) => !expectedKeys.has(k));
    eq(stray.length, 0, `a key nobody argued for started being read: ${stray.join(", ")} — a coverage wave's footprint has to be the keys it disclosed`);
    ok(byKey.has("family_support"), "family_support must appear as disclosed collateral — landing an act makes every live row on that measure readable, and hiding that understates the footprint");

    // rural_ag: exactly the side-casters on roll 154, at thin or stronger.
    const sideCasters = new Set((vote.memberVotes || []).filter((m) => m.position === "yea" || m.position === "nay").map((m) => m.politicianId));
    const noSide = new Set((vote.memberVotes || []).filter((m) => m.position === "present" || m.position === "not_voting").map((m) => m.politicianId));
    const ra = byKey.get("rural_ag") || [];
    eq(ra.length, vote._attributedSides, "every member who cast a side on roll 154 — and only those — must gain a rural_ag read");
    for (const g of ra) {
      ok(sideCasters.has(g.pid), `${g.pid} gained a rural_ag read without casting a side on roll 154`);
      ok(!!g.nowTier && g.nowTier !== "empty", `${g.pid}: rural_ag landed at tier ${JSON.stringify(g.nowTier)} — a filled key must reach thin or stronger`);
    }
    for (const pid of noSide) ok(!ra.some((g) => g.pid === pid), `${pid} did not cast a side and must gain nothing — Present and Not Voting are never a direction`);

    // housing_support: both chambers, and the seed's figures have to be the measured ones.
    const hs = byKey.get("housing_support") || [];
    const cen = (decide.census || {}).membersNewlyThinReadable || {};
    eq(hs.length, (cen.housing_support_house || 0) + (cen.housing_support_senate || 0),
      "the housing_support gain must equal the seed's House-plus-Senate figure, measured against the ATTRIBUTED rolls and not the chamber headcounts");
    for (const g of hs) ok(!!g.nowTier && g.nowTier !== "empty", `${g.pid}: housing_support landed at tier ${JSON.stringify(g.nowTier)}`);
    eq(cen.rural_ag_house, ra.length, "the seed's rural_ag figure does not match the measurement");

    // No member's overall tier moved and no floor moved: a coverage wave fills keys.
    eq(base.after.empty, base.before.empty, "the empty-member count moved in a wave that moves no floor");
    eq(base.weakened.length, 0, `tier weakening: ${base.weakened.join(", ")} — a coverage wave may not weaken a member`);
    eq(base.newSplits.length, 0, `members gained a split row: ${base.newSplits.join(", ")}`);
    eq(C.fpiMembersWhoseShapeMoved, base.drift.length, "the seed's shape-moved figure does not match the measurement");
    // 530 is the footprint, 524 is the coverage, and the seed has to say which is which.
    const distinct = new Set([...ra.map((g) => g.pid), ...hs.map((g) => g.pid)]).size;
    eq(distinct, cen.distinctMembersGainingAtLeastOneKey, "the distinct-members-gaining figure does not match the measurement");
    ok(distinct <= base.drift.length, "more members gained a filled-key read than had their shape move at all, which is impossible");
    ok(/footprint/.test(String(cen._fpiCrossCheck || "")), "the seed must reconcile the footprint figure against the coverage figure rather than printing whichever is larger");

    // ── 7. THE MUTATION ─────────────────────────────────────────────────
    // Drop the one admitted mapping row and the members who gained a
    // housing_support read must return to EMPTY on that key — absent from the read
    // set, not present at a weaker tier. Run against the real engine on a
    // one-row-lighter seed, through --seed-override, so nothing is rewritten on disk
    // and no sibling audit can be poisoned by this one (runbook rule 47).
    const mutPath = join(tmpdir(), `f11-mutation-drop-one-mapping-${process.pid}.json`);
    try {
      const mutated = JSON.parse(JSON.stringify(decide));
      mutated.measures = [];   // the admitted mapping row, and only that, is gone
      writeFileSync(mutPath, JSON.stringify(mutated));
      const mut = runFpi(["--seed-override", `f11=${mutPath}`]);
      eq(mut.seed.added, 0, "the mutation must project zero mapping rows — if it still adds one, the override did not take and nothing below is a mutation");
      eq(mut.seedOverrides && mut.seedOverrides.f11, mutPath, "the FPI must report the override it ran under, so a mutated run can never be quoted as a measurement");
      const mutGained = new Set((mut.gainedReads || []).filter((g) => g.key === "housing_support").map((g) => g.pid));
      eq(mutGained.size, 0,
        `dropping the admitted mapping left ${mutGained.size} member(s) still reading housing_support — the key's only federal instrument is that row, so every one of them must return to empty`);
      // And the act's key must be unaffected: the mutation drops a mapping, not a roll.
      const mutRa = (mut.gainedReads || []).filter((g) => g.key === "rural_ag").length;
      eq(mutRa, ra.length, "dropping the housing_support mapping must not change the rural_ag gain — the two admits are independent and a mutation that moves both is measuring something else");
      eq((mut.lostReads || []).length, 0, "the mutated run must still lose no read");
      console.log(`      (mutation: dropped 1 mapping row → ${hs.length} housing_support reads returned to empty, rural_ag unchanged at ${mutRa})`);
    } catch (e) {
      failures.push(`the mutation clause could not be run, so "drop one admitted mapping and those members return to empty" is unverified: ${e && e.message}`);
    } finally {
      try { if (existsSync(mutPath)) unlinkSync(mutPath); } catch { /* the temp file is outside the tree; a leftover cannot poison a sibling audit */ }
    }
  }

  // ── 8. the pack fingerprint moves ───────────────────────────────────
  // Rows are written, so mappingVersion() must move on its own and the six-hour
  // PACK_TTL_MS cannot serve a pre-F11 blob past the deploy. The seed records both
  // the start value and a COMPUTED end value; this checks the live table against
  // whichever of the two it is currently sitting on.
  const pk = decide.packNote || {};
  ok(/derived|purge/.test(String(pk.decision || "")), "the pack note must decide derived or purge");
  ok(/-- pack-generation: derived/.test(SQL), "the migration must carry the pack-generation comment or scripts/test-vr-mapping-migration-pack-step.mjs fails CI");
  ok(/^m\d+-[0-9a-f]{12}$/.test(String(pk.mappingVersionStart || "")), "the pack note must record a real mapping-version start value");
  ok(/^m\d+-[0-9a-f]{12}$/.test(String(pk.mappingVersionEnd || "")), "the pack note must record a real mapping-version END value — 'recorded later' is how a pack key silently stays put");
  ok(pk.mappingVersionStart !== pk.mappingVersionEnd,
    "the mapping version must MOVE — a coverage wave that writes rows and leaves the fingerprint alone repeats the Curtis/Lee stale-blob failure");
  try {
    const { default: pg } = await import("pg");
    const cl = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
    await cl.connect();
    const r = (await cl.query(`select count(*)::int n, coalesce(md5(string_agg(measure_id || ':' || issue_key || ':' || weight || ':' || is_primary || ':' || support_meaning || ':' || coalesce(rationale, ''), ',' order by id)), 'empty') h from vr_measure_issues`)).rows[0];
    const live = `m${r.n}-${String(r.h).slice(0, 12)}`;
    await cl.end();
    const applied = live === pk.mappingVersionEnd;
    ok(applied || live === pk.mappingVersionStart,
      `the live mapping version is ${live}, which is neither the recorded start (${pk.mappingVersionStart}) nor the recorded end (${pk.mappingVersionEnd}) — `
      + `something changed vr_measure_issues between this seed and this run, so the pack fingerprint this wave promised is not the one that will ship`);
    console.log(`      (pack: live mappingVersion ${live} — migration ${applied ? "APPLIED" : "not yet applied"})`);
    if (applied) {
      eq(r.n, C.mappingRowsAfter, "the applied row count does not match the seed's after figure");
    } else {
      eq(r.n, C.mappingRowsBefore, "the pre-migration row count does not match the seed's before figure");
    }
  } catch (e) {
    failures.push(`the pack fingerprint could not be read, so the stale-blob guarantee is unverified: ${e && e.message}`);
  }
}

// ── 9. the migration is last in the tree, guarded, and self-verifying ───
{
  ok(SQL.length > 0, `${MIG} exists`);
  const MIGS = readdirSync(join(ROOT, "netlify/database/migrations")).filter((f) => f.endsWith(".sql")).sort();
  eq(MIGS[MIGS.length - 1], "20261028000000_vr_federal_wave_f11.sql", "F11's migration must be last in the tree");
  ok(/F10's RESERVED STAMP/.test(SQL), "the migration must say which stamp it consumed and where the stamp came from");
  // No applied migration was edited: every other file is byte-identical to HEAD.
  const edited = MIGS.filter((f) => {
    if (f === "20261028000000_vr_federal_wave_f11.sql") return false;
    try { return execFileSync("git", ["show", `HEAD:netlify/database/migrations/${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }) !== R(`netlify/database/migrations/${f}`); }
    catch { return false; }
  });
  eq(edited.length, 0, `an applied migration was edited (${edited.join(", ")}) — applied migrations are immutable and are rolled forward, never rewritten`);

  // The DELETEs must be guarded on every identifying column AND the exact rationale.
  for (const r of decide.retractions || []) {
    const re = new RegExp(`DELETE FROM vr_measure_issues[\\s\\S]{0,900}?issue_key = '${r.issueKey}'[\\s\\S]{0,900}?rationale = '`);
    ok(re.test(SQL), `${r.issueKey}: the migration must DELETE it guarded on issue_key AND the exact rationale`);
    const blk = SQL.slice(SQL.indexOf(`issue_key = '${r.issueKey}'`));
    ok(new RegExp(`weight = ${r.was.weight}`).test(blk.slice(0, 500)), `${r.issueKey}: the DELETE must be guarded on the weight it argues about`);
    ok(new RegExp(`is_primary = ${r.was.isPrimary}`).test(blk.slice(0, 500)), `${r.issueKey}: the DELETE must be guarded on is_primary`);
    ok(new RegExp(`support_meaning = '${r.was.supportMeaning}'`).test(blk.slice(0, 500)), `${r.issueKey}: the DELETE must be guarded on support_meaning`);
    ok(SQL.includes(r.was.rationale.replace(/'/g, "''")), `${r.issueKey}: the DELETE's rationale guard must be the row's EXACT live rationale, or it will match nothing and remove nothing`);
    // And it must be asserted GONE afterwards, or a no-match DELETE ships silently.
    ok(new RegExp(`n_retracted[\\s\\S]{0,300}issue_key = '${r.issueKey}'[\\s\\S]{0,300}RAISE EXCEPTION`).test(SQL),
      `${r.issueKey}: the migration must RAISE if the row survives — a retraction that silently matched nothing publishes the thing it refused`);
  }
  // The added row must be asserted present with its stated polarity.
  const add = (decide.measures || [])[0].issues[0];
  ok(new RegExp(`INSERT INTO vr_measure_issues[\\s\\S]{0,400}'${add.issueKey}', ${add.weight}, ${add.isPrimary}`).test(SQL),
    "the migration must INSERT the admitted row at the weight and lane the seed argues for");
  ok(new RegExp(`v_weight <> ${add.weight} OR v_primary <> ${add.isPrimary} OR v_meaning <> '${add.supportMeaning}'`).test(SQL),
    "the migration must RAISE if the added row landed at a different weight, lane or polarity");
  // The act's PRIMARY and the *_balance row must both be asserted still there.
  ok(/issue_key = 'rural_ag' AND is_primary = true AND weight = 100/.test(SQL),
    "the migration must assert H.R. 7567 still holds its rural_ag PRIMARY — the act it lands would otherwise have nothing to read");
  ok(/issue_key = 'enviro_balance'/.test(SQL) && /does not touch \*_balance keys/.test(SQL),
    "the migration must assert the *_balance row is still on file and still unread — doctrine is only doctrine if it is there to be suppressed");
  // Attribution guards.
  ok(new RegExp(`n_votes <> ${vote.memberVotes.length}`).test(SQL), "the migration must assert its member-vote count");
  ok(new RegExp(`n_sides <> ${vote._attributedSides}`).test(SQL), "the migration must assert its attributed-side count");
  ok(/n_sides > 435/.test(SQL), "the migration must assert the attribution ceiling against the chamber headcount");
  ok(/position IN \('present','not_voting'\) AND is_party IS NOT NULL/.test(SQL),
    "the migration must assert no Present or Not Voting row carries a direction");
  // The status correction is guarded on the from-value and named as display only.
  const sc = (decide.statusCorrections || [])[0];
  ok(new RegExp(`SET status = '${sc.to}'[\\s\\S]{0,200}AND status = '${sc.from}'`).test(SQL),
    "the status correction must be guarded on the from-value, or it overwrites whoever moved it last");
  ok(/display only|display correction/i.test(SQL) && /Nothing in stance-helpers\.js reads measure status/.test(SQL),
    "the migration must record that every passed_house consumer was checked and none of them is a score (runbook rule 46)");
  // No judge, no Utah PDF, no LLM summary, no party word in anything shipped.
  // THE WALL. Nothing judicial feeds Direction Match, Word vs Action, the formal
  // tiers, the publication floor or any score, so nothing judicial belongs in a
  // federal formal-record migration either. Two false friends have to come out
  // first: _RD_MIN_JUDGED is the depth floor and "judged" is its counter, neither
  // of which is a judiciary; and justice_reform / judicial_check are ordinary
  // legislative issue keys about courts policy, which is a subject Congress votes
  // on and not a judge's retention record.
  // A third exemption, and the migration earns it: a comment line that ASSERTS the
  // wall ("Nothing judicial is touched: THE WALL holds") is the opposite of a
  // breach, and dropping the whole line is safer than special-casing the sentence.
  const sqlNonJudicial = SQL.split("\n").filter((l) => !/THE WALL/.test(l)).join("\n")
    .replace(/_RD_MIN_JUDGED|judged/gi, "").replace(/justice_reform|judicial_check/g, "");
  ok(/Nothing judicial is touched: THE WALL holds/.test(SQL),
    "the migration must affirm the wall rather than leave it implied");
  ok(!/\bjudge|\bjudicial|\bjustices?\b|retention|JPEC/i.test(sqlNonJudicial),
    `judicial material appears in a federal formal-record migration — THE WALL (${(sqlNonJudicial.match(/\bjudge\w*|\bjudicial\w*|\bjustices?\b|retention|JPEC/gi) || []).slice(0, 6).join(", ")})`);
  ok(!/language model|LLM|GPT|generated summary/i.test(SQL), "no machine-written bill summary may appear in a migration");
  ok(!/\b(Republicans?|Democrats?) (voted|opposed|supported)\b/i.test(SQL), "no party-line reasoning in a shipped rationale");
}

// ── 10. the seed and vote seed are declared, so the stray gate stays quiet
{
  for (const suite of ["scripts/test-vr-federal-wave-f8.mjs", "scripts/test-vr-federal-wave-f9.mjs"]) {
    const src = R(suite);
    if (!/DECLARED/.test(src)) continue;
    for (const f of [MAP_SEED, VOTE_SEED, MIG, "scripts/vr-gen-federal-wave-f11-vote-seed.mjs",
                     "scripts/vr-gen-federal-wave-f11-migration.mjs", "scripts/test-vr-federal-wave-f11.mjs",
                     // The two gates this wave edited count as its footprint too, and the
                     // stray gate reads git status, not intent.
                     "scripts/test-vr-vote-seed.mjs", "scripts/test-vr-federal-wave-f10.mjs"]) {
      ok(src.includes(f), `${suite} must declare ${f} or its stray-file gate fires on this wave's own artifacts`);
    }
  }
}

// ── 10b. the two gates F11 edited, and what the edits may not have cost ──
// Both edits widen a door, which is the shape of change that quietly becomes a hole.
// So each is pinned to the reason it was made, against the source, offline. If someone
// later widens either one further, these fail rather than ageing into folklore.
{
  // The vote-seed gate: it must still read the mirror, must now also read the migrations,
  // and must still refuse a measure that has neither. The last clause is the one that
  // matters — the exemption door is what keeps H.R. 1069 and F7's seven Iran resolutions
  // arguing their refusals key by key, and a gate that accepted everything would retire
  // that doctrine silently while every suite stayed green.
  const vs = R("scripts/test-vr-vote-seed.mjs");
  ok(/MAPPED_BY_MIGRATION/.test(vs), "the vote-seed gate no longer reads the migrations for issue mappings");
  ok(/MAPPED\.has\(mkey\(m\.congress, m\.number\)\) \|\| MAPPED_BY_MIGRATION\.has/.test(vs),
    "the mirror must still be consulted first — the migration read is an addition, not a replacement");
  ok(/declaredUnmapped && facetsRefused\.length > 0/.test(vs),
    "the declinedFacets door must still be the only other way through");
  ok(vs.includes("DELETE\\s+FROM\\s+vr_measure_issues") && /pairs\.delete/.test(vs),
    "a retracted (measure, key) pair must be subtracted, or a measure whose rows were all "
    + "deleted would keep counting as mapped and never have to argue its refusal");
  ok(/runbook rule 20/.test(vs), "the edit must cite the doctrine that makes the mirror partial by design");
  // And the residual it cannot see, stated rather than implied: a binding it cannot
  // resolve is not credited to anything.
  ok(/[Ff]ail-closed/.test(vs), "the migration read must say which way it fails when it cannot bind a variable");

  // The F10 gate: F10 shipped nothing, and that claim is untouched. What moved is only
  // the reserved stamp, and F10's own seed is what authorises the move.
  const f10 = R("scripts/test-vr-federal-wave-f10.mjs");
  ok(/recorded here and not\s*\n?\s*\/\/ consumed|not\s+consumed, so the next wave takes it/.test(f10),
    "the narrowed stamp check must quote F10's own seed rather than assert the change on its own authority");
  ok(/rowsShipped/.test(f10) && /migrationsWritten/.test(f10),
    "F10's no-write claim must survive the edit — nothing about rowsShipped or migrationsWritten may have moved");
  const f10seed = JSON.parse(R("db/vr-federal-mapping-seed-f10.json"));
  ok(/not consumed, so the next wave takes it/.test(JSON.stringify(f10seed)),
    "F10's seed no longer says the reserved stamp passes to the next wave — the basis for consuming it is gone");
  ok(/vr-federal-mapping-seed-.*\.json/.test(f10), "the consumer must be identified by its own declaring seed, not by name");
  eq(MIG, "netlify/database/migrations/20261028000000_vr_federal_wave_f11.sql",
    "F11's migration is no longer at the stamp F10 reserved, so the F10 edit was unnecessary and should be reverted");
}

// ── report ──────────────────────────────────────────────────────────────
console.log(`\n  test-vr-federal-wave-f11 — ${passed} passed, ${failures.length} failed${skips.length ? `, ${skips.length} skipped` : ""}\n`);
for (const s of skips) console.log(`   ~ ${s}`);
if (failures.length) {
  for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
  if (failures.length > 60) console.log(`   … and ${failures.length - 60} more`);
  console.log("");
  process.exit(1);
}
console.log(`  F11: COVERAGE · ${C.actsAdmitted} act admitted · ${C.mappingRowsAdded} mapping row added, ${C.mappingRowsRetracted} retracted · `
  + `${C.keysFilled} keys filled (rural_ag House, housing_support both chambers) · ${C.keysRefused} refused in writing · `
  + `${C.membersNewlyThinReadable} members newly thin-readable · ${C.newIssueKeys} new keys, ${C.newPoles} new poles, 0 floors moved\n`);
