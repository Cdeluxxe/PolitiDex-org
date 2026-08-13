#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the PRESIDENTIAL path through ⚖️ Word vs Action
// ─────────────────────────────────────────────────────────────────────────────
// Congress has a clean "did" side: roll-call votes. Presidents cast none, so every
// presidential Word vs Action read used to come back `pending` — 0 tested items out
// of 19 scorable ones, a total blank on the profile's primary signal. The fix is an
// adapter, not a second scoring system: kept executive actions are converted into the
// record-item shape stance-helpers.js's _issueRecordSummary already understands, and
// the resulting summary is returned in officialIssue()'s `record` slot. word-action.js
// is unchanged — judgedOf, scoreFromRecord and testOf all read it as they always did.
//
// What this harness gates, in order:
//
//   1. THE OFFICE GATE — only figures PDXExecRecord admits reach this lane at all.
//   2. THE ADAPTER — items arrive in the shape the shared summariser needs, carrying
//      every mapping so an omnibus still discloses both of its directions.
//   3. THE CIRCULARITY GUARD — the central design of this pass. A presidential stance
//      card is usually written FROM the record and cites the very document that would
//      test it. Two independent signals suppress that pair, either one sufficient.
//   4. FAIL CLOSED — an unreadable direction or an uncitable standing is coverage,
//      never a guess, and never a warming state.
//   5. ONE INTEGRITY READ — one percentage, from PDXWordAction, on the same floors as
//      everyone else. No presidential score, no pledge tally, no dual percentages.
//   6. THE LANE'S VOCABULARY — a president is never told what they did with a vote.
//   7. THE CONGRESSIONAL PATH, UNCHANGED — the same assertions run against a federal
//      member with a real roll-call read and against a genuinely thin non-president.
//
// Trump is the subject. `bennie_thompson` is the congressional control (a real
// roll-call read in this sandbox), `clint_painter_juab` the thin control (3 stated
// positions, nothing tested) — so "works for presidents" is checked against both
// "still works for members" and "still reads as a coverage gap when it should".
//
//   node scripts/test-exec-word-action.mjs
//
// No database, no network, no DOM beyond gen-hero-showcase.mjs's shared stub.
// Exit code is non-zero on the first failure.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The real browser modules, in load order, in the same sandbox the hero showcase
// generator uses — so this measures the shipped engine and not a copy of it.
const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "consistency.js",
  "word-action.js",
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
for (const f of FILES) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}

const CS = win.PDXConsistency;
const WA = win.PDXWordAction;
const ER = win.PDXExecRecord;
const XA = CS.execActions;

const SEED = JSON.parse(readFileSync(join(ROOT, "db/exec-action-seed.json"), "utf8"));

const PID = "trump";
const P = win.CMP_DATA[PID];
const MEMBER = "bennie_thompson";        // a federal member with a real roll-call read
const THIN = "clint_painter_juab";       // stated positions, nothing tested yet

let pass = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else fails.push(msg); }
function eq(a, b, msg) {
  if (a === b) pass++;
  else fails.push(`${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}
function has(hay, needle, msg) {
  ok(String(hay == null ? "" : hay).toLowerCase().indexOf(String(needle).toLowerCase()) !== -1, msg);
}
function lacks(hay, needle, msg) {
  ok(String(hay == null ? "" : hay).toLowerCase().indexOf(String(needle).toLowerCase()) === -1, msg);
}
function section(n) { console.log(`\n${n}\n`); }

ok(P, "fixture: trump is in CMP_DATA");
ok(CS && WA && ER && XA, "fixture: every module under test loaded and exported");

/* ─── a fully-held issue, on demand ──────────────────────────────────────────
   A FULLY held issue — every document on it circular against the card that states
   the position — is a distinct engine state with its own token, its own reason and
   its own caption, and all three have to stay covered. What it is not any more is a
   fact about the seed: wave 4 broke the hold on end_dei and wave 5 broke it on
   healthcare and cost_living by putting independent documents on them, which is what
   those waves existed to do. Pinning the state to whichever issue happens to be held
   this month means the assertion moves every wave and silently stops asserting
   anything the wave it survives.

   So the example is constructed instead of curated: the real pool minus every
   healthcare document whose mapping is not already circular against the card that
   states the position — which is exactly the pool that produced the state before
   those waves. The list is DERIVED rather than named, because a hardcoded pair
   ["Executive Order 14212", "Executive Order 14293"] stopped being the whole set
   the moment wave 7 put a Term 45 healthcare order on file and the read path
   started counting every term. Nothing here is invented — the pair that holds,
   Public Law 119-21 → healthcare, and its circularWithStance flag are the seed's
   own, and the real pool is restored the moment the block ends. */
function mapsCleanly(a, key) {
  return (a.issues || []).some((m) => m.issueKey === key && !m.circularWithStance);
}
function withHealthcareFullyHeld(fn) {
  const real = win.EXEC_ACTIONS[PID];
  win.EXEC_ACTIONS[PID] = real.filter((a) => !mapsCleanly(a, "healthcare"));
  try { return fn(); } finally { win.EXEC_ACTIONS[PID] = real; }
}
/* …and the same trick for the other constructed state this file needs: an issue the
   figure has STATED a position on and no action touches at all. That used to be a
   fact about the seed too — the list in the comment below once read tariffs_growth,
   cost_living, restraint, crypto_cbdc — and it is now a fact about nothing: read
   over all terms, every stated position on this profile has at least one document
   behind it. That is the point of the last three waves and it must not quietly
   disable the assertions that depend on the empty state, so the empty state is
   built rather than found. */
function withIssueUnmapped(key, fn) {
  const real = win.EXEC_ACTIONS[PID];
  win.EXEC_ACTIONS[PID] = real
    .map((a) => {
      const issues = (a.issues || []).filter((m) => m.issueKey !== key);
      return issues.length ? Object.assign({}, a, { issues }) : null;
    })
    .filter(Boolean);
  try { return fn(); } finally { win.EXEC_ACTIONS[PID] = real; }
}
// The swap has to actually change something, or every assertion made inside it is
// being made about the ordinary pool and proves nothing.
eq(withHealthcareFullyHeld(() => XA.forIssue(PID, "healthcare").items.length), 0,
  "fixture: the withheld pool really does leave healthcare with nothing scorable");
ok(XA.forIssue(PID, "healthcare").items.length > 0,
  "fixture: and the real pool — the one every other assertion reads — does score it");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the office gate");
// ═════════════════════════════════════════════════════════════════════════════

eq(XA.eligible(PID), true, "gate: the president reaches the executive lane");
eq(XA.eligible(MEMBER), false, "gate: a federal member does not");
eq(XA.eligible(THIN), false, "gate: a thin local official does not");
eq(XA.eligible("no_such_person"), false, "gate: an unknown pid does not throw and does not pass");
eq(XA.eligible(null), false, "gate: a null pid does not throw and does not pass");
// The gate is PDXExecRecord's, not a second copy of it living in consistency.js.
eq(XA.eligible(PID), ER.eligible(PID), "gate: consistency.js defers to PDXExecRecord.eligible");

// A figure off this lane gets an empty pool rather than an exception, on every helper.
eq(XA.forIssue(MEMBER, "lower_taxes").items.length, 0, "gate: forIssue is empty off-lane");
eq(XA.forIssue(MEMBER, "lower_taxes").touched, 0, "gate: nothing is even touched off-lane");
eq(XA.issues(MEMBER).length, 0, "gate: issues() is empty off-lane");
eq(XA.summary(MEMBER, "lower_taxes"), null, "gate: summary() is null off-lane");
eq(XA.proofLines(MEMBER, "lower_taxes").length, 0, "gate: proofLines() is empty off-lane");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the adapter: exec actions in record-item shape");
// ═════════════════════════════════════════════════════════════════════════════

const bs = XA.forIssue(PID, "border_security");
ok(bs.items.length >= 1, "adapter: border_security has at least one usable action");
for (const it of bs.items) {
  eq(it.kind, "position", "adapter: items are 'position' kind, which _voteEffectiveSupport reads via item.supports");
  eq(it.supports, true, "adapter: the president advanced the document they signed or issued");
  eq(it.isProcedural, false, "adapter: no executive action is a procedural motion");
  ok(Array.isArray(it.issues) && it.issues.length >= 1, "adapter: items carry their issue mappings");
  ok(it.date, "adapter: items carry the date the action was taken");
  ok(it.sourceUrl && it.sourceLabel, "adapter: items carry their own citation");
  ok(it.standing, "adapter: a usable item always has a citable standing");
  eq(it.execAction, true, "adapter: items are marked as belonging to this lane");
  for (const m of it.issues) {
    ok(m.supportMeaning === "yea_supports" || m.supportMeaning === "yea_opposes",
      "adapter: every mapping resolves to a supportMeaning the shared engine understands");
    ok(typeof m.weight === "number" && m.weight > 0, "adapter: every mapping carries a positive weight");
  }
}

// An omnibus reports EVERY direction from one signature, exactly as one roll call on
// H.R. 1 does — otherwise a reconciliation bill would look single-issue.
const omni = bs.items.find((it) => it.documentId === "Public Law 119-21");
ok(omni, "adapter: the reconciliation law is among border_security's actions");
if (omni) {
  ok(omni.issues.length > 5, "adapter: the omnibus carries all of its mappings, not just the one asked for");
  ok(omni.issues.some((m) => m.supportMeaning === "yea_supports"), "adapter: the omnibus discloses its advancing side");
  ok(omni.issues.some((m) => m.supportMeaning === "yea_opposes"), "adapter: the omnibus discloses its opposing side");
}

// advanceInverted is how a veto is modelled: it pushes the measure backward, and that
// is the field the shared summariser already uses for measure-direction correction.
for (const it of bs.items) {
  eq(it.advanceInverted, it.actionClass === "vetoed_law",
    "adapter: only a veto inverts the measure direction");
}

// The summary is produced by the SHARED function, so it exposes the shared fields.
const sum = XA.summary(PID, "border_security");
ok(sum, "adapter: the shared summariser accepts the converted items");
ok(sum && typeof sum.total === "number" && sum.total >= 1, "adapter: the summary counts its records");
ok(sum && typeof sum.netVerdict === "string", "adapter: the summary carries a netVerdict");
ok(sum && sum.execPool, "adapter: the summary carries the pool it was built from");

// issues() is the union over KEPT actions, held pairs included — a held pair is still
// coverage, and issuesWithSignal must list it so the row can explain itself. The key
// is discovered rather than named: which issues carry a held pair is a curation fact
// that moves with every wave, and a pinned key would quietly stop testing the union.
const keys = XA.issues(PID);
ok(keys.length >= 15, "adapter: issues() spans the seeded mappings");
const heldKey = keys.filter((k) => XA.forIssue(PID, k).held.length > 0)[0];
ok(heldKey, "adapter: issues() includes a key that carries a held pair — a hold is coverage, not a deletion");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the circularity guard (the central design of this pass)");
// ═════════════════════════════════════════════════════════════════════════════

// PDXWordAction's third rule is that a position is never its own test. It enforces
// that per ITEM: word-action.js's isIndependentWord() catches a card that leads with a
// record verb and cites the clerk. What it cannot catch is a card that asserts a view
// in the figure's own voice and then cites the very document that would test it —
// which is the normal shape of a presidential stance card. So the guard here is
// per (action → issue) PAIR, with two independent signals.

// ── 3a. the declared signal: a flag on the pair, in the seed ──
const declared = [];
for (const a of SEED.actions[PID]) {
  for (const m of a.issues || []) {
    if (m.circularWithStance) declared.push([a.documentId, m.issueKey, m.circularNote]);
  }
}
// The guard must still be load-bearing. One pair was retired on purpose — H.R. 1 →
// national_debt, once the stance card on that issue stopped being a narration of
// H.R. 1 itself — so the floor is 6, not 7. It stays a floor rather than an exact
// count because the guard is a curation judgement and pairs will come and go.
ok(declared.length >= 6, `guard: the seed declares circular pairs (found ${declared.length})`);
for (const [doc, key, note] of declared) {
  ok(note && note.length > 40,
    `guard: the declared pair ${doc} → ${key} carries a prose reason, not a bare boolean`);
  const pool = XA.forIssue(PID, key);
  const held = pool.held.find((h) => h.documentId === doc);
  ok(held, `guard: ${doc} → ${key} is held out of the scored pool`);
  if (held) {
    eq(held.reason, "circular", `guard: ${doc} → ${key} is held for circularity specifically`);
    eq(held.why, "declared", `guard: ${doc} → ${key} is held on the declared signal`);
    eq(held.note, note, `guard: ${doc} → ${key} surfaces the seed's own reason verbatim`);
    ok(held.sourceUrl && held.sourceLabel,
      `guard: ${doc} → ${key} keeps its citation while held — it is coverage, not a deletion`);
  }
  ok(!pool.items.some((it) => it.documentId === doc),
    `guard: ${doc} → ${key} never reaches the scored items`);
}

// ── 3b. the mechanical signal: the card names the document itself ──
// Identifiers are derived from the document, so a card quoting "EO 14154" or "H.R. 1"
// is caught even with no flag in the seed.
const ids14154 = XA.identifiers({ documentId: "Executive Order 14154", title: "Unleashing American Energy" });
ok(ids14154.indexOf("executive order 14154") !== -1, "guard: the full document id is an identifier");
ok(ids14154.indexOf("eo 14154") !== -1, "guard: the short 'EO nnnnn' form is an identifier");
ok(ids14154.indexOf("14154") !== -1, "guard: the bare number is an identifier");
ok(ids14154.indexOf("unleashing american energy") !== -1, "guard: the title is an identifier");
const idsPL = XA.identifiers({ documentId: "Public Law 119-21", measureNumber: "H.R. 1" });
ok(idsPL.indexOf("119-21") !== -1, "guard: the public-law number is an identifier");
ok(idsPL.indexOf("h.r. 1") !== -1, "guard: the measure number is an identifier");
// Short strings are dropped: a 1-3 character needle would match everything.
ok(XA.identifiers({ documentId: "", title: "ABC" }).length === 0,
  "guard: a needle too short to be distinctive is not used");

// A needle ending in a digit must not run into more digits, or Public Law 119-1's
// identifier would match a sentence about Public Law 119-10 and suppress a real test.
eq(XA.namesDocument("he signed public law 119-1 last week", ["public law 119-1"]), true,
  "guard: an exact document mention is caught");
eq(XA.namesDocument("he signed public law 119-10 last week", ["public law 119-1"]), false,
  "guard: 119-1 does NOT match a sentence about 119-10 — the digit boundary holds");
eq(XA.namesDocument("eo 141545 was different", ["eo 14154"]), false,
  "guard: a longer number is not a match for a shorter one");
eq(XA.namesDocument("signed eo 14154, unleashing american energy", ["eo 14154"]), true,
  "guard: a mention followed by punctuation is still a match");
eq(XA.namesDocument("", ["eo 14154"]), false, "guard: empty prose names nothing");
eq(XA.namesDocument("eo 14154", []), false, "guard: no identifiers means no match");

// The card's own prose is what is searched, and it is searched in two forms so a
// card writing "H.R.1" still matches a seed writing "H.R. 1".
const said = XA.saidText(PID, "national_debt");
ok(said && said.plain, "guard: the stance card's prose is readable for matching");
ok(said && said.squeezed && said.squeezed.indexOf(" ") === -1,
  "guard: the squeezed form drops spacing so 'H.R.1' and 'H.R. 1' converge");

// ── 3c. the guard is PER PAIR, not per action and not per issue ──
// energy_production is flagged against the two orders whose titles its card quotes,
// and scored against the reconciliation law, which that card does not name. This is
// the case that proves the granularity is real and not decorative.
const ep = XA.forIssue(PID, "energy_production");
ok(ep.held.some((h) => h.documentId === "Executive Order 14154"),
  "granularity: energy_production is held against the order its card quotes");
ok(ep.items.some((it) => it.documentId === "Public Law 119-21"),
  "granularity: energy_production is STILL scored by a document its card does not name");
const epOv = CS.officialRecord(PID, "energy_production");
eq(epOv.token, "consistent", "granularity: a partly-held issue still produces a verdict");
eq(epOv.lane, "exec", "granularity: and it produces it on the executive lane");
// The same action is held on one issue and scored on another — per pair, not per action.
// end_dei is the standing proof that the guard is a HOLD and not a deletion: EO 14151 is
// still held here, and the issue is nonetheless scored, because wave 4 put a second
// document on it (EO 14173) that no card in the app names. Wave 5 did the same for
// healthcare and cost_living, so the fully-held state below is reached through the
// withheld pool rather than through whichever issue is still stuck.
const dei = XA.forIssue(PID, "end_dei");
ok(dei.held.some((h) => h.documentId === "Executive Order 14151"),
  "granularity: EO 14151 is still held on end_dei");
ok(dei.items.some((it) => it.documentId === "Executive Order 14173"),
  "granularity: end_dei is scored by a second document its card does not name");
// Wave 5's own unlocks, asserted from the other side: the pair that used to hold each
// issue outright is STILL held, and the issue is scored anyway. That is the rule's
// prescribed fix — a different document — as opposed to a lifted flag, and it is the
// one thing about these waves worth pinning permanently.
for (const [key, heldDoc, freeDoc] of [
  ["healthcare", "Public Law 119-21", "Executive Order 14212"],
  ["cost_living", "Presidential Memorandum, 90 FR 8245", "Proclamation 11010"]
]) {
  const pool = XA.forIssue(PID, key);
  ok(pool.held.some((h) => h.documentId === heldDoc),
    `granularity: ${heldDoc} is still held on ${key} — the flag was not lifted`);
  ok(pool.items.some((it) => it.documentId === freeDoc),
    `granularity: ${key} is scored by ${freeDoc}, a document no card names`);
}

// ── 3d. a held pair is a COVERAGE GAP, never a grade ──
const deiOv = withHealthcareFullyHeld(() => CS.officialRecord(PID, "healthcare"));
eq(deiOv.token, "no_record", "coverage: a fully-held issue reads as no record");
eq(deiOv.score, null, "coverage: and carries no percentage — never a false 0%");
eq(deiOv.pending, false, "coverage: a held issue is NOT a warming state");
ok(deiOv.execHeld, "coverage: the read carries the held pool so the row can say why");
ok(deiOv.execHeld && deiOv.execHeld.circular >= 1, "coverage: and counts the circular suppressions");
eq(deiOv.lane, "exec", "coverage: an empty exec read still declares its lane");
// Its reason names the real cause rather than the generic one.
has(CS.proof.rowVerdict(deiOv).why, "written from that same document",
  "coverage: the row explains the circularity rather than implying we did not look");
has(CS.proof.rowVerdict(deiOv).why, "coverage, not a verdict",
  "coverage: and frames it as coverage explicitly");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · fail closed");
// ═════════════════════════════════════════════════════════════════════════════

// Every held reason is one of the three the adapter can produce. A fourth would mean
// something is being dropped without a stated cause.
const REASONS = { circular: 1, no_standing: 1, unmapped_direction: 1 };
let heldTotal = 0;
for (const k of XA.issues(PID)) {
  for (const h of XA.forIssue(PID, k).held) {
    heldTotal++;
    ok(REASONS[h.reason], `fail closed: held reason '${h.reason}' is a declared one`);
    ok(h.documentId || h.title, "fail closed: a held entry names its document");
  }
}
ok(heldTotal >= 6, `fail closed: the held set is non-trivial (${heldTotal} pairs)`);

// touched counts every pair the seed reaches, scored or not — so a gap can be told
// apart from an absence. On the real pool the invariant is that a held pair still
// counts as coverage: touched runs ahead of the scored items rather than the hold
// erasing the document from the issue's file.
for (const k of XA.issues(PID)) {
  const pool = XA.forIssue(PID, k);
  if (!pool.held.length) continue;
  eq(pool.touched, pool.items.length + pool.held.length,
    `fail closed: ${k}'s touched count carries its held pairs as coverage`);
}
// And the limiting case, on the withheld pool: when EVERY pair on an issue is held,
// the issue is still touched and still scores nothing at all.
const hc = withHealthcareFullyHeld(() => XA.forIssue(PID, "healthcare"));
ok(hc.touched > 0, "fail closed: an issue the seed reaches is 'touched' even when nothing scores");
eq(hc.items.length, 0, "fail closed: and scores nothing");
eq(withHealthcareFullyHeld(() => CS.officialRecord(PID, "healthcare").token) !== "pending", true,
  "fail closed: which reads as a coverage gap, not as pending");

// …and the opposite case, which is the point of the circular guard rather than a
// side effect of it. `national_debt` carries a stated commitment to reduce the debt
// that is independent of H.R. 1 — it is sourced to the DOGE executive order and
// names no reconciliation bill — so the law IS allowed to test it, and the CBO
// deficit finding produces a contradiction. A held pair proves the guard fires; this
// pair proves it is a guard and not a blanket.
const dbt = XA.forIssue(PID, "national_debt");
ok(dbt.items.length >= 1, "fail closed: a word the document did not write is testable by it");
eq(CS.officialRecord(PID, "national_debt").token, "contradicts",
  "fail closed: a deficit-increasing law tested against a debt-reduction claim contradicts it");

// An issue with an action but NO stated position reads as 'no stance' — not 'limited'.
// 'limited' would assert there is word here with no clear direction; the truth is that
// nothing was said.
const unstated = XA.issues(PID).filter((k) => {
  const ov = CS.officialRecord(PID, k);
  return ov && ov.lane === "exec" && !ov.hasStance;
});
ok(unstated.length >= 1, "fail closed: at least one action lands on an issue with no stated position");
for (const k of unstated) {
  eq(CS.officialRecord(PID, k).token, "no_stance",
    `fail closed: ${k} reads as 'no stance', not as an inconclusive test`);
}

// A read on this lane never queues a warm — there is no roll call coming.
for (const k of XA.issues(PID)) {
  const ov = CS.officialRecord(PID, k);
  if (ov && ov.execHeld) eq(ov.pending, false, `fail closed: ${k} does not warm a record that will never arrive`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · one integrity read, on the shared floors");
// ═════════════════════════════════════════════════════════════════════════════

const r = WA.read(PID, P);
eq(typeof r.pct, "number", "read: the president now has a real percentage");
eq(r.publishable, true, "read: and it clears the publish floors");
ok(r.tested.length >= WA.MIN_TESTED_ITEMS,
  `read: tested items clear MIN_TESTED_ITEMS (${r.tested.length} ≥ ${WA.MIN_TESTED_ITEMS})`);
ok(r.testedWeight >= WA.MIN_TESTED_WEIGHT,
  `read: tested weight clears MIN_TESTED_WEIGHT (${r.testedWeight} ≥ ${WA.MIN_TESTED_WEIGHT})`);
ok(r.coverage.scorable > r.tested.length,
  "read: coverage still reports the untested remainder rather than hiding it");

// Every tested row names the lane that tested it, and there are exactly two lanes a
// president can be tested by: the executive record, and their own itemized pledges
// resolved against their own sources. Both are checked here rather than pinning one,
// because the thing this assertion exists to catch is a borrowed roll call — a
// president scored on a vote they could not cast. 'pledge-ledger' is not that: it
// never consults the record at all, which is why an itemized pledge can be tested on
// an issue whose stance card is circular against the only document on file.
const PRESIDENTIAL_BASES = ["exec-actions", "pledge-ledger"];
for (const t of r.tested) {
  ok(PRESIDENTIAL_BASES.indexOf(t.test.basis) !== -1,
    `read: ${t.issueKey} is tested by the executive record or the pledge ledger (got "${t.test.basis}")`);
  eq(t.test.state, "tested", `read: ${t.issueKey} is a real test, not a placeholder`);
  ok(typeof t.test.score === "number", `read: ${t.issueKey} carries a numeric score`);
  ok(t.test.evidence >= 1 && t.test.evidence <= WA.EVIDENCE_CAP,
    `read: ${t.issueKey}'s evidence weight respects EVIDENCE_CAP`);
}
// Neither lane may go quiet. If every tested row came from the pledge ledger the exec
// adapter could be broken and this file would still pass; if every row came from the
// record, the pledge tier would be decorative. Both must be carrying rows.
ok(r.tested.some((t) => t.test.basis === "exec-actions"),
  "read: the executive record is testing at least one row — the adapter is not idle");
ok(r.tested.some((t) => t.test.basis === "pledge-ledger"),
  "read: the pledge ledger is testing at least one row — the tier is not decorative");

// ONE percentage. Not two, not a presidential variant, not a pledge tally.
eq(ER.issue(PID, "border_security").score, null,
  "one read: PDXExecRecord still refuses to produce a score of its own");
eq(ER.summary(PID) && ER.summary(PID).score, null,
  "one read: and its count summary's score is structurally null — the set of orders a president could sign has no honest denominator");
const heroR = WA.heroRead ? WA.heroRead(PID, P) : null;
if (heroR) {
  eq(heroR.pct, r.pct, "one read: the hero and the section report the same number");
}
// The pledge tier is a form of "said", not a parallel track. It now carries eleven
// itemized pledges, and the assertion that matters is not how many — it is that they
// feed the SAME percentage and produce no second one. The count is derived from the
// data so itemizing more pledges never has to touch this line.
eq(r.tiers.pledge && r.tiers.pledge.total, (P.promises || []).length,
  "one read: every itemized pledge on file reaches the tier — none silently dropped");
ok((P.promises || []).length > 0,
  "one read: the itemized pledges are actually present (a zero here makes the tier assertions vacuous)");
ok(!("pledgePct" in r) && !("promiseScore" in r),
  "one read: the read exposes no second percentage under any name");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the lane's vocabulary");
// ═════════════════════════════════════════════════════════════════════════════

// A proof line names the DOCUMENT and where it stands — the two things a roll-call
// line does not need. An order under an injunction is weaker evidence than one in
// force, and a line that hid that would overclaim by omission.
const lines = XA.proofLines(PID, "border_security", 2);
ok(lines.length >= 1, "vocabulary: a tested exec issue produces proof lines");
for (const l of lines) {
  eq(l.kind, "exec-action", "vocabulary: proof lines declare they are not roll calls");
  ok(l.documentId, "vocabulary: a proof line names its document");
  has(l.text, l.documentId, "vocabulary: and the rendered text leads with it");
  ok(l.url && l.label, "vocabulary: a proof line carries its primary source");
  const st = ER.STANDING[l.standing];
  ok(st, "vocabulary: a proof line's standing is one PDXExecRecord recognises");
  if (st) has(l.text, st.label, "vocabulary: and the standing is stated, not assumed");
}
// A standing PDXExecRecord cannot cite prints nothing rather than an assumed "in force".
lacks(XA.proofText({ documentId: "Executive Order 99999", actionClass: "executive_order" }),
  "in force", "vocabulary: an uncitable standing is silent, never assumed");
has(XA.proofText({ documentId: "Executive Order 99999", actionClass: "executive_order" }),
  "Executive Order 99999", "vocabulary: but the document is still named");

// The flagship dot rows: "They did" must name the action, and it must be named in the
// noun of whichever lane resolved it. A president's dot rows now come from two places
// — an executive document, or a pledge resolved in the ledger — and the failure this
// guards against is the same for both: a row that says "They did" and then shows a
// count of votes, or nothing at all.
const DOT_KIND_FOR = { "exec-actions": "exec-action", "pledge-ledger": "ledger" };
const dots = WA.dots(PID, P, { limit: 5 });
ok(dots.length >= 3, "vocabulary: the president has dot rows to render");
for (const d of dots) {
  const want = DOT_KIND_FOR[d.outcome.basis];
  ok(!!want, `vocabulary: dot row ${d.issueKey} is on a presidential lane (got "${d.outcome.basis}")`);
  ok(d.actions.length >= 1, `vocabulary: dot row ${d.issueKey} names what they DID`);
  for (const a of d.actions) eq(a.kind, want, `vocabulary: dot-row action on ${d.issueKey} is a ${want}`);
}
// The "judged N" count renders only when the outcome carries a judged tally, and only
// the record lane does. A pledge row therefore shows no count rather than a count of
// one — which is the honest rendering: its evidence is its own sourced outcome, not a
// tally of documents. What must never appear is the vote noun.
for (const d of dots) {
  if (d.outcome.basis !== "exec-actions") {
    eq(typeof d.outcome.judged === "number" && d.outcome.judged > 0, false,
      `vocabulary: pledge dot row ${d.issueKey} claims no tally of judged records`);
  }
}
const dotsHtml = WA.dotsHtml(PID, P, { limit: 5 });
lacks(dotsHtml, "judged vote", "vocabulary: no dot row calls a signature a judged vote");
has(dotsHtml, "judged action", "vocabulary: it says judged action instead");
lacks(dotsHtml, "No formal action on this issue is on record yet",
  "vocabulary: no tested row claims there is no action on file");

// The whole Official Record section, rendered. This is the surface that used to ask a
// president what they did when they had to vote.
const sec = CS.officialRecordSectionHtml(PID, P);
const secText = sec.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
// The seed's own circularNote prose legitimately says "the bill page" — it is
// describing what a stance card cites. Excluded so the sweep stays meaningful.
const sweep = secText.split(/\s{2,}/).filter((s) => s.indexOf("cites the bill page") === -1).join("  ");
for (const word of ["voted ", "roll call", " yea", " nay", "no votes yet", "qualifying votes"]) {
  lacks(sweep, word, `vocabulary: the president's Official Record section never says "${word.trim()}"`);
}
// The section's question moved into the "How to read this" sheet when the header was
// compressed to two lines. The office-awareness did not move with it: the header
// digest names what these rows were tested against, in the lane's own nouns.
has(sec, "orders, signings and vetoes",
  "vocabulary: the section names the record that is actually true of the office");
// Empty rows must never be captioned with a claim their own evidence list refutes.
// Three different things can be missing here and each gets its own true caption. The
// first is rendered from the withheld pool: no seeded issue is fully held any more,
// and the caption for that state still has to be reachable and still has to be true.
has(withHealthcareFullyHeld(() => CS.officialRecordSectionHtml(PID, P)), "On file, not scorable",
  "vocabulary: a row whose actions are all held says so — it does not claim there is no action");
has(sec, "No stated position yet",
  "vocabulary: a row with a clean action and no stated position says THAT is what is missing");
// "No action on file yet" is now REACHABLE in this section, and it has to be. This
// used to be a flat lacks() over the whole rendered section, and it passed for the
// wrong reason: officialIssue() put every issue an exec-eligible figure had no order
// mapped to into 'pending', so no row could reach the empty-file caption at all.
// Thirteen of Trump's stated positions genuinely have no executive action on file
// (the four tariff issues, cost of living, restraint and the rest), and for those
// rows "No action on file yet" is the true caption — while 'pending' was a wait on a
// roll call that was never coming. What must stay impossible is the caption
// appearing on a row that DOES hold an action, which is the case the two has()
// assertions above pin down. So the gate moves to the data: the caption's own
// condition is `!execTouched`, so no touched issue can reach it.
{
  for (const k of XA.issues(PID)) {
    const ovk = CS.officialRecord(PID, k);
    ok((ovk.execTouched || 0) > 0,
      `${k} carries an executive action but reports execTouched 0 — it would be captioned as an` +
      `\n    empty file with the document sitting in its own evidence list`);
  }
  // …and the other half: an exec-eligible figure must never sit in a roll-call wait.
  // The control issues used to be DISCOVERED from the data — the stated positions
  // with no document behind them — because a hardcoded list does not fail when the
  // seed grows under it, it just starts asserting the opposite of what it was
  // written to assert. Discovery has now hit the same wall from the other side:
  // read over all terms there are no such issues left, so a discovered list is
  // empty and the assertion runs zero times. Both facts are pinned. The milestone
  // is asserted directly, and then the state is CONSTRUCTED for every stated
  // position in turn — which tests more than the old discovery ever did, since it
  // no longer depends on which issues happen to be thin this month.
  const stated = Object.keys(win._polPositionMap(PID, P) || {});
  ok(stated.length >= 1, "fixture: the president has stated positions to test");
  const controls = stated.filter((k) => (CS.officialRecord(PID, k).execTouched || 0) === 0);
  eq(controls.length, 0,
    `a stated position has no executive action on file across any term (${controls.join(", ")}) —` +
    `\n    the discovered control is live again, so assert on it rather than only on the constructed one`);
  for (const k of stated) {
    withIssueUnmapped(k, () => {
      const ov = CS.officialRecord(PID, k);
      eq(ov.execTouched || 0, 0, `fixture: unmapping ${k} did not actually empty its executive file`);
      eq(!!ov.pending, false,
        `${k} is still 'pending' on a president: that is a wait on a roll call that will never` +
        `\n    arrive, it never clears, and issueRow() refuses the public-record basis while it stands`);
    });
  }
}has(sec, "1 action", "vocabulary: the composition meter counts actions");
// The row shortcut into a voting record is suppressed — there is no destination.
lacks(sec, "Open this vote in the full record",
  "vocabulary: no row offers a link into a roll-call list this figure does not have");
lacks(sec, "data-pdxc-vrvote", "vocabulary: and no exec proof line carries a roll-call deep link");
// Held actions are LISTED with their reason, so a thin row explains itself.
has(sec, "cannot also be the test of it", "vocabulary: a held action states why it is held");
has(sec, "Executive Order 14154", "vocabulary: and names itself while doing so");
has(sec, "Federal Register", "vocabulary: linking the primary source");
// Signing a bill and issuing an order are different claims about authorship.
has(sec, "Signed into law", "vocabulary: a signature is named as a signature");
has(sec, "Multi-issue action", "vocabulary: an omnibus signature discloses its breadth");
lacks(sec, "one vote, 14 issues", "vocabulary: and does not call that signature a vote");

// ── the EXPLAINERS around the number, not just the number ────────────────────
// The scoring path was president-correct while every sentence explaining it was
// not: the ⚖️ card's own "How this is counted" told a reader the score came from
// roll-call votes, and the 📋 gateway card asked "When they had to vote" directly
// above a section asking "When they could act on their own". A reader cannot check
// us on a method described in the wrong lane, so the prose is gated like the data.
const waSec = WA.sectionHtml(PID, P);
const waText = waSec.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
for (const word of ["roll-call", "roll call", "Voted no", "House Clerk", "a single vote"]) {
  lacks(waText, word, `explainer: the president's Word vs Action card never says "${word}"`);
}
has(waText, "laws signed or vetoed, orders and directives",
  "explainer: the feed row names what actually tested this president");
has(waText, "the laws they signed or vetoed, the executive orders and the formal directives",
  "explainer: and the method paragraph defines Action in the same lane");
// The circularity example must be drawn from a document this figure really has, and
// cited to the source of record its own class declares — otherwise the worked example
// teaches a rule using evidence the reader cannot go and check.
has(waText, "Signed Executive Order 14156",
  "explainer: the circularity example uses a real seeded order");
has(waText, "Federal Register",
  "explainer: cited to the source of record for orders, not the House Clerk");
ok(SEED.actions[PID].some((a) => a.documentId === "Executive Order 14156" &&
     (a.issues || []).some((i) => i.circularWithStance)),
  "explainer: and that order is genuinely circular-flagged in the seed, not invented");

// The gateway card is the door into all of this, and it publishes the core question.
const gate = CS.gatewayHtml(PID, P);
const gateText = gate.replace(/<[^>]+>/g, " ");
has(gateText, "When they could act on their own, did they do what they said?",
  "explainer: the gateway asks the executive question");
lacks(gateText, "When they had to vote", "explainer: and not the roll-call one");
lacks(gateText, "the votes and official acts", "explainer: the boundary line drops the vote noun");
has(gateText, "the laws they signed or vetoed and the orders they issued",
  "explainer: and names the executive record instead");

// The divergence panel labels the 🏛️ side it is comparing.
const dvText = CS.divergenceSectionHtml(PID, P).replace(/<[^>]+>/g, " ");
lacks(dvText, "(votes)", "explainer: the divergence panel does not mislabel the exec side as votes");
lacks(dvText, "a voting record", "explainer: nor its empty state");

// The global methodology sheet is shared by every profile, so the congressional
// wording STAYS and the executive lane is added beside it.
const meth = CS.methodologyHtml();
has(meth, "roll-call votes and formal actions",
  "explainer: the shared sheet keeps the congressional lane");
has(meth, "Presidents and the formal record",
  "explainer: and states the executive lane too");
has(meth, "no separate presidential rating",
  "explainer: declaring there is one score, not two");
has(meth, "cannot also be the test of that order",
  "explainer: and writing the circularity rule down where a reader can check it");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the congressional path, unchanged");
// ═════════════════════════════════════════════════════════════════════════════

const MP = win.CMP_DATA[MEMBER];
ok(MP, "control: the congressional control is in CMP_DATA");
const mr = WA.read(MEMBER, MP);
ok(mr.tested.length >= 1, "control: the member still has a real roll-call read");
for (const t of mr.tested) {
  ok(t.test.basis !== "exec-actions", `control: ${t.issueKey} is NOT tested by executive actions`);
}
for (const k of CS.issuesWithSignal(MEMBER, "official")) {
  const ov = CS.officialRecord(MEMBER, k);
  ok(!ov || ov.lane !== "exec", `control: ${k} never lands on the executive lane`);
  ok(!ov || !ov.execHeld, `control: ${k} carries no held exec pool`);
}
// The member's section keeps the congressional wording, verbatim.
const msec = CS.officialRecordSectionHtml(MEMBER, MP);
has(msec, "tested against roll-call votes",
  "control: the member's section stopped naming the roll-call record");
lacks(msec, "orders, signings and vetoes",
  "control: and is not told its rows were tested against an executive record");
lacks(msec, "No action on file yet", "control: empty member rows still say 'No votes yet'");
lacks(msec, "judged action", "control: the member's composition still counts votes");

// The member's EXPLAINERS are untouched too — the lane swap must be inert for
// everyone off the executive gate, which is all but one figure in the app.
const mWaText = WA.sectionHtml(MEMBER, MP).replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
has(mWaText, "roll-call votes and formal acts, judged issue by issue",
  "control: the member's feed row still names roll calls");
has(mWaText, "Voted no on H.R. 8", "control: and keeps the congressional circularity example");
has(mWaText, "House Clerk", "control: cited to the chamber, as before");
lacks(mWaText, "Signed Executive Order", "control: with no executive wording leaking in");
const mGate = CS.gatewayHtml(MEMBER, MP).replace(/<[^>]+>/g, " ");
has(mGate, "When they had to vote, did they stand by what they said?",
  "control: the member's gateway keeps the roll-call question");
has(mGate, "the votes and official acts", "control: and its boundary line is unchanged");
lacks(mGate, "the orders they issued", "control: no executive noun on a legislator's card");

// The thin control: a genuinely sparse NON-president must still read as a coverage
// gap in the congressional lane — the fix must not turn thin into executive. The
// read itself is asserted in full further down, beside the office-lane checks.
const tThinHtml = WA.sectionHtml(THIN, win.CMP_DATA[THIN]);
const tThinText = tThinHtml.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
has(tThinText, "roll-call votes and formal acts", "thin: keeps the congressional explainer");
lacks(tThinText, "orders and directives", "thin: and gains no executive wording");
// The headline slot itself, not the prose around it: the explainer legitimately
// contains "100%" while describing why a self-testing position would score one.
has(tThinHtml, '<div class="pdxwa-num-v">—</div>',
  "thin: the headline number is an em-dash, never a published percentage");
// The shared row vocabulary is untouched for a lane-less read.
eq(CS.proof.rowVerdict({ token: "no_record", record: null }).label, "No votes yet",
  "control: a read with no lane keeps the congressional empty label");
eq(CS.proof.rowVerdict({ token: "no_record", record: null, lane: "record" }).label, "No votes yet",
  "control: an explicit record lane does too");
eq(CS.proof.rowVerdict({ token: "no_record", record: null, lane: "exec" }).label, "No action on file yet",
  "control: only the exec lane swaps it");
eq(CS.proof.rowVerdict({ token: "wat", lane: "exec" }).label, "No action on file yet",
  "control: an unknown token degrades to the lane's empty label, not to a blank");

// ── the three empty captions, each one keyed to WHICH side is actually missing ──
// Getting this wrong is not a cosmetic slip: it prints a caption the row's own
// evidence list refutes two lines further down.
eq(CS.proof.rowVerdict({ token: "no_record", lane: "exec", execTouched: 0 }).label,
  "No action on file yet", "captions: nothing mapped to the issue → no action on file");
eq(CS.proof.rowVerdict({ token: "no_record", lane: "exec", execTouched: 2 }).label,
  "On file, not scorable", "captions: action mapped but all of it held → on file, not scorable");
eq(CS.proof.rowVerdict({ token: "no_stance", lane: "exec", execTouched: 2 }).label,
  "No stated position yet", "captions: clean action, nothing said → the WORD side is the gap");
has(CS.proof.rowVerdict({ token: "no_stance", lane: "exec", execTouched: 2 }).why,
  "have not stated a position", "captions: and the reason says so rather than claiming a position exists");
has(CS.proof.rowVerdict({ token: "no_stance", lane: "exec", execTouched: 0 }).why,
  "have not stated a position", "captions: an unspoken, unmapped issue does not claim a position either");
// A held pool with no execTouched field still resolves — the field is additive, and an
// older shape must not silently fall back to the wrong caption.
eq(CS.proof.rowVerdict({ token: "no_record", lane: "exec", execHeld: { held: [{}], circular: 0 } }).label,
  "On file, not scorable", "captions: a held pool alone is enough to know the file is not empty");

// The lane belongs to the OFFICE, so an issue no action maps to is still not asked
// about votes — this is the case that used to leak the congressional wording.
// The lane belongs to the OFFICE, so an issue no action maps to is still not asked
// about votes — this is the case that used to leak the congressional wording. The
// empty file is constructed, for the same reason as above: read over all terms,
// "restraint" now has a document on it and no stated position on this profile is
// untouched any more.
const untouched = "restraint";
withIssueUnmapped(untouched, () => {
  eq(XA.forIssue(PID, untouched).touched, 0, "office lane: the probe issue really has no action mapped");
  eq(CS.officialRecord(PID, untouched).lane, "exec",
    "office lane: an issue with no exec action on it is STILL on the president's lane");
});
eq(CS.officialRecord(MEMBER, "gun_rights") && CS.officialRecord(MEMBER, "gun_rights").lane === "exec", false,
  "office lane: and a member is never pulled onto it by the same path");

// The thin non-president control: still honestly thin, and untouched by any of this.
const TP = win.CMP_DATA[THIN];
ok(TP, "control: the thin control is in CMP_DATA");
const tr = WA.read(THIN, TP);
eq(tr.publishable, false, "thin control: a genuinely thin figure is still not publishable");
eq(tr.pct, null, "thin control: and carries no percentage");
eq(tr.tested.length, 0, "thin control: nothing is tested");
ok(tr.coverage.word >= 1, "thin control: the word that IS on file is still counted");
eq(XA.eligible(THIN), false, "thin control: never reaches the executive lane");
for (const k of CS.issuesWithSignal(THIN, "official")) {
  const ov = CS.officialRecord(THIN, k);
  ok(!ov || ov.lane !== "exec", `thin control: ${k} stays off the executive lane`);
}
// A thin read reads as a coverage gap, not as a grade of zero.
ok(tr.pct === null, "thin control: thin is null, never 0%");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · two scopes: all time is the score, this term is the slice");
// ═════════════════════════════════════════════════════════════════════════════
/* The scoring scope used to be current-term and nothing said so — not the number,
   not the caption, not the method drawer. It is all-time now, which is the whole
   formal record of the person, and the current term is a labelled slice underneath
   it. What has to stay true is that these are ONE engine under two settings, that
   the setting cannot leak out of the read that asked for it, and that the slice
   only exists where it means something. */

// The default is the whole record, and it is declared rather than implied.
eq(XA.DEFAULT_SCOPE, "all_time", "scope: the declared default is not the whole record");
eq(XA.scope().key, "all_time", "scope: the live default is not the whole record");
eq(WA.read(PID, P).termScope.key, "all_time",
  "scope: the headline read is not over the whole record");
ok(XA.SCOPES.all_time && XA.SCOPES.current_term,
  "scope: both scopes are not published for a surface to label");
for (const k of Object.keys(XA.SCOPES)) {
  ok(XA.SCOPES[k].label && XA.SCOPES[k].note,
    `scope: ${k} carries no label or note, so a surface would have to invent its own wording`);
}

// The runner is the only way in, and it restores what it found — including on a throw.
{
  const inner = XA.withScope("current_term", () => XA.scope().key);
  eq(inner, "current_term", "scope: withScope did not apply the scope it was given");
  eq(XA.scope().key, "all_time", "scope: withScope leaked the scope past its own callback");
  let threw = false;
  try { XA.withScope("current_term", () => { throw new Error("boom"); }); }
  catch (e) { threw = true; }
  ok(threw, "scope: withScope swallowed an exception from its callback");
  eq(XA.scope().key, "all_time", "scope: a throwing read left the scope changed behind it");
  // An unknown scope falls back to the default rather than to an undefined setting.
  eq(XA.withScope("no_such_scope", () => XA.scope().key), "all_time",
    "scope: an unknown scope name did not fail closed to the default");
}

// Both reads, one call — and the slice really is a slice.
{
  const sr = WA.scopedRead(PID, P);
  eq(sr.lane, "exec", "scoped: the president is not on the executive lane");
  eq(sr.serving, true, "scoped: the sitting president does not read as serving");
  eq(sr.applicable, true, "scoped: the current-term slice was withheld from a sitting president");
  eq(sr.term, ER.currentTerm(PID), "scoped: the slice does not name the term it covers");
  eq(sr.main.termScope.key, "all_time", "scoped: the main read is not the whole record");
  eq(sr.current.termScope.key, "current_term", "scoped: the slice is not the current term");
  eq(sr.main.pct, WA.read(PID, P).pct, "scoped: the main read disagrees with the default read");

  // The slice is computed by the same engine under the other setting — not by a
  // second scorer. If these ever diverge there are two scoring paths, which is the
  // one thing this design exists to avoid.
  const viaRunner = XA.withScope("current_term", () => WA.read(PID, P));
  eq(sr.current.pct, viaRunner.pct, "scoped: the slice is not what the shared engine produces");
  eq(sr.current.token, viaRunner.token, "scoped: the slice's verdict is not the engine's");
  eq(sr.current.testedWeight, viaRunner.testedWeight, "scoped: the slice's weight is not the engine's");

  // Same floors, both scopes. Scope selection is not permission to publish a number
  // a narrower record could not support.
  eq(sr.current.floors.items, sr.main.floors.items, "scoped: the slice uses a different count floor");
  eq(sr.current.floors.weight, sr.main.floors.weight, "scoped: the slice uses a different weight floor");

  // The slice is a subset of the record, so it can never rest on more evidence.
  ok(sr.current.testedWeight <= sr.main.testedWeight,
    "scoped: the current-term slice carries MORE tested weight than the whole record it is drawn from");

  // The contrast is reported rather than assumed, so a surface can say "the same"
  // without a reader having to compare two numbers to find out.
  eq(typeof sr.differs, "boolean", "scoped: the slice does not report whether it differs at all");
  if (typeof sr.main.pct === "number" && typeof sr.current.pct === "number") {
    eq(sr.delta, sr.current.pct - sr.main.pct, "scoped: the reported delta is not the actual difference");
  }
}

// Off the lane, and off the roster: the slice collapses, the main number does not.
{
  const sm = WA.scopedRead(MEMBER, win.CMP_DATA[MEMBER]);
  eq(sm.lane, "record", "scoped: a member was put on the executive lane");
  eq(sm.applicable, false, "scoped: a member was offered a current-term slice");
  eq(sm.current, null, "scoped: a member's slice was computed anyway");
  ok(sm.main && sm.main.coverage, "scoped: a member lost their main read to the scope change");

  // A FORMER officeholder. Incumbency is declared on the roster, so this is exactly
  // what a president who has left office looks like to this code — and the required
  // behaviour is that the slice disappears while the all-time score, which is the
  // whole point of the change, is untouched.
  const realServing = ER.serving;
  ER.serving = () => false;
  try {
    const sf = WA.scopedRead(PID, P);
    eq(sf.serving, false, "scoped: a former officeholder still reads as serving");
    eq(sf.applicable, false, "scoped: a former officeholder was offered a current-term slice");
    eq(sf.current, null, "scoped: a former officeholder's slice was computed anyway");
    eq(sf.main.pct, WA.read(PID, P).pct,
      "scoped: leaving office changed the all-time score, which spans every term including that one");
    lacks(WA.headlineHtml(PID, P), "pdxwa-slice",
      "scoped: the card still prints a current-term strip for someone not serving");
  } finally { ER.serving = realServing; }
}

// What actually reaches the card: the main number labelled as all-time, and the
// slice labelled as this term with the containment said in words.
{
  const card = WA.headlineHtml(PID, P);
  const sr = WA.scopedRead(PID, P);
  has(card, "pdxwa-num-scope", "card: the main number carries no scope tag");
  has(card, XA.SCOPES.all_time.label, "card: the main number does not say which record it is over");
  has(card, `Current term (${sr.term})`, "card: the slice is not labelled with the term it covers");
  has(card, "The score above is the whole record, every term",
    "card: the slice does not say it is contained in the score above");
  has(card, `${sr.main.pct}%`, "card: the all-time percentage is not the one printed");
  // Secondary means the reader meets the main number first. The DOM order is the
  // only guarantee of that which survives a stylesheet not loading.
  ok(card.indexOf('class="pdxwa-num-v"') < card.indexOf('class="pdxwa-slice"'),
    "card: the current-term strip is rendered before the number it is secondary to");
  // …and the two are never presented as the same measurement.
  has(card, "The record counted", "card: the method drawer does not state which record the number is over");

  // ── THE CLARITY CONTRACT ────────────────────────────────────────────────────
  // A first-time reader has to get three things off this header without opening a
  // drawer: which record the big number is over, that the second figure is a slice
  // of that record, and why the two can differ. The first two are pinned above. The
  // third is a question a second number ASKS, and leaving it to the layout to answer
  // is how a slice gets read as a rival score. It is asked only where the two figures
  // actually came out apart — see scopeStripHtml's `why`.
  has(card, "the whole record, every term — this one counted inside it",
    "card: the slice no longer says it is counted inside the score above");
  if (typeof sr.current.pct === "number" && sr.delta !== 0) {
    has(card, "which is why the two can differ",
      "card: the slice never says why the two figures can differ — the question a second number asks");
  }
  // The difference is stated against the number it is a difference from, by value, so
  // a reader does not have to scroll back up and subtract.
  if (sr.differs && typeof sr.main.pct === "number" && typeof sr.current.pct === "number") {
    has(card, `${sr.main.pct}% above`,
      "card: the slice reports a difference without naming the figure it differs from");
  }
  // And it is stated in words. "3 points lower than the full record" is accurate and
  // is exactly the register a first-time reader's eye slides off.
  for (const stat of ["point lower", "points lower", "point higher", "points higher"]) {
    lacks(card, stat,
      `card: the slice reports the gap as "${stat}" — dense stats phrasing where plain words were asked for`);
  }
  // The glyph that hangs the strip off the number above it is decoration: the same
  // relationship is in the copy, so a screen reader must not be read a stray arrow.
  has(card, 'class="pdxwa-slice-tie" aria-hidden="true"',
    "card: the slice's hang-off marker is gone, or is exposed to a screen reader as content");
  // A member's card says nothing about scope, because nothing about their record is
  // term-scoped and a label naming a distinction that does not exist is noise.
  const mcard = WA.headlineHtml(MEMBER, win.CMP_DATA[MEMBER]);
  lacks(mcard, "pdxwa-num-scope", "card: a member's number carries an executive-lane scope tag");
  lacks(mcard, "pdxwa-slice", "card: a member's card carries a current-term strip");
}

// The hero says it too — one number, and the span it covers.
{
  const h = WA.heroRead(PID, P);
  eq(h.pct, WA.read(PID, P).pct, "hero: the ring disagrees with the section beneath it");
  has(h.sub, "all time", "hero: the ring's caption does not say which record the number is over");
  // …in the scope's OWN words. The ring and the card sit one scroll apart and name
  // the same span; typing that span twice is how they end up naming it differently.
  has(h.sub, ` · ${XA.SCOPES.all_time.label.toLowerCase()}`,
    "hero: the ring's scope wording is not taken from the scope's label, so it can drift from the card's");
  eq(h.scopeLabel, XA.SCOPES.all_time.label,
    "hero: the exposed scope label is not the scope model's own");
  const hm = WA.heroRead(MEMBER, win.CMP_DATA[MEMBER]);
  if (hm && hm.sub) lacks(hm.sub, "all time", "hero: a member's ring claims an executive-lane scope");
}

// ── report ──
console.log("");
if (fails.length) {
  console.error(`✖ ${fails.length} failure(s), ${pass} passed\n`);
  for (const f of fails) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ presidential word vs action: ${pass} checks passed — ` +
  `${r.tested.length} issue(s) tested from the executive record, ${heldTotal} pair(s) held as coverage, ` +
  `one integrity read at ${r.pct}%`);
