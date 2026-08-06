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
// coverage, and issuesWithSignal must list it so the row can explain itself.
const keys = XA.issues(PID);
ok(keys.length >= 15, "adapter: issues() spans the seeded mappings");
ok(keys.indexOf("end_dei") !== -1, "adapter: issues() includes a key whose only action is held");

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
const dei = XA.forIssue(PID, "end_dei");
ok(dei.held.some((h) => h.documentId === "Executive Order 14151"),
  "granularity: EO 14151 is held on end_dei");
ok(dei.items.length === 0, "granularity: end_dei has nothing left to score");

// ── 3d. a held pair is a COVERAGE GAP, never a grade ──
const deiOv = CS.officialRecord(PID, "end_dei");
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
// apart from an absence. `healthcare` is the standing example: the only stance card
// on that issue is a narration of H.R. 1's own coverage score, so the document
// cannot test it and the row honestly scores nothing.
const hc = XA.forIssue(PID, "healthcare");
ok(hc.touched > 0, "fail closed: an issue the seed reaches is 'touched' even when nothing scores");
eq(hc.items.length, 0, "fail closed: and scores nothing");
ok(CS.officialRecord(PID, "healthcare").token !== "pending",
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

// Every tested row is basis 'exec-actions' — the lane names itself, so a surface can
// cite the document instead of a vote, and nothing silently borrowed a roll call.
for (const t of r.tested) {
  eq(t.test.basis, "exec-actions", `read: ${t.issueKey} is tested by the executive record`);
  eq(t.test.state, "tested", `read: ${t.issueKey} is a real test, not a placeholder`);
  ok(typeof t.test.score === "number", `read: ${t.issueKey} carries a numeric score`);
  ok(t.test.evidence >= 1 && t.test.evidence <= WA.EVIDENCE_CAP,
    `read: ${t.issueKey}'s evidence weight respects EVIDENCE_CAP`);
}

// ONE percentage. Not two, not a presidential variant, not a pledge tally.
eq(ER.issue(PID, "border_security").score, null,
  "one read: PDXExecRecord still refuses to produce a score of its own");
eq(ER.summary(PID) && ER.summary(PID).score, null,
  "one read: and its count summary's score is structurally null — the set of orders a president could sign has no honest denominator");
const heroR = WA.heroRead ? WA.heroRead(PID, P) : null;
if (heroR) {
  eq(heroR.pct, r.pct, "one read: the hero and the section report the same number");
}
// The pledge tier is a form of "said", not a parallel track.
eq(r.tiers.pledge && r.tiers.pledge.total, 0,
  "one read: trump has no itemised pledges on file — and none were invented to fill the gap");
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

// The flagship dot rows: "They did" must name the action, and the count must be in
// this lane's noun.
const dots = WA.dots(PID, P, { limit: 5 });
ok(dots.length >= 3, "vocabulary: the president has dot rows to render");
for (const d of dots) {
  eq(d.outcome.basis, "exec-actions", `vocabulary: dot row ${d.issueKey} is on the executive lane`);
  ok(d.actions.length >= 1, `vocabulary: dot row ${d.issueKey} names what they DID`);
  for (const a of d.actions) eq(a.kind, "exec-action", "vocabulary: dot-row actions are exec actions");
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
has(sec, "When they could act on their own, did they do what they said?",
  "vocabulary: the section asks the question that is actually true of the office");
// Empty rows must never be captioned with a claim their own evidence list refutes.
// Three different things can be missing here and each gets its own true caption.
has(sec, "On file, not scorable",
  "vocabulary: a row whose actions are all held says so — it does not claim there is no action");
has(sec, "No stated position yet",
  "vocabulary: a row with a clean action and no stated position says THAT is what is missing");
lacks(sec, "No action on file yet",
  "vocabulary: and no row in this section falsely claims an empty file — every issue here has one");
has(sec, "1 action", "vocabulary: the composition meter counts actions");
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
has(msec, "When they had to vote, did they stand by what they said?",
  "control: the member is still asked the roll-call question");
lacks(msec, "When they could act on their own",
  "control: and is not asked the executive one");
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
const untouched = "restraint";
eq(XA.forIssue(PID, untouched).touched, 0, "office lane: the probe issue really has no action mapped");
eq(CS.officialRecord(PID, untouched).lane, "exec",
  "office lane: an issue with no exec action on it is STILL on the president's lane");
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
