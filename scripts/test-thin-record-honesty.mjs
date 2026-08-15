#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-thin-record-honesty.mjs — whose gap is it, said on the row face
// ─────────────────────────────────────────────────────────────────────────────
// Four fifths of the issue rows this product renders are unscored, and the great
// majority of those are unscored for a reason that has nothing to do with the
// politician: we hold their votes, mapped and sourced, and we hold no stated
// position of theirs on that issue to test them against. The row face said
// "Thin record — There is a record here, but none of it takes a clear side on
// this claim", which is a sentence about THEM, and false twice over: there is no
// claim, and the votes take sides all day. The reader was being handed our
// documentation gap dressed as a shrug about their record.
//
// The rules this pins:
//
//   1. THE CLASSIFICATION IS HONEST. rowResult separates "we hold no stated
//      position" from "the record really is thin", and the no-position sentence
//      is never printed over a row that has a position on file.
//   2. THE INVENTORY IS SHOWN, NOT A SCORE. A no-position row states how many
//      instruments are on file, in the office's own noun, and stays unscored:
//      no percentage, no verdict promoted, no change to what the score counts.
//   3. THE COUNT IS THE DOOR. The same row carries a control into the issue
//      dossier, asking it to land on the formal enumeration — the destination
//      already existed, the invitation did not.
//   4. A TRULY THIN ROW IS UNTOUCHED. A row with a stated position and one
//      judged vote keeps its own reason and is never told it has no position.
//
//   node scripts/test-thin-record-honesty.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache. No database, no
// network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

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
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;

const CS = win.PDXConsistency;
const WA = win.PDXWordAction;

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`  · ${t}`);

const PID = "massie";

// ── Which issues does this member have a position on file for, and which not ──
// Both cases have to be REAL rows off the real row model, so the keys are chosen
// from what the profile actually carries rather than asserted.
const stanceKeys = new Set(
  CS.issueRows(PID).filter((r) => r.said).map((r) => r.key)
);
const ISSUE_KEYS = Object.keys(win.ISSUE_MAP || {});
const SILENT = ISSUE_KEYS.filter((k) => !stanceKeys.has(k))[0];
const SPOKEN = ISSUE_KEYS.filter((k) => stanceKeys.has(k))[0];
if (!SILENT || !SPOKEN) {
  console.error("✗ thin-record honesty: the fixture profile no longer offers both cases");
  process.exit(1);
}

// ── Seeds ────────────────────────────────────────────────────────────────────
// SILENT: a deep formal record — six sourced roll calls, mapped, no position of
// theirs on file. This is the shape 8,000-odd live rows are in.
// SPOKEN: a position we DO hold, and a record that genuinely takes no side on it —
// two votes cast "present", which is the other thing `limited` means. This is the
// row the old sentence was written for, and the one it must keep.
const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 500 + n, measureId: 900 + n, number: "H.R. " + (100 + n),
  date: "2025-0" + ((n % 9) + 1) + "-14", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (500 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
const HELD = 6;
const seeded = [];
for (let i = 0; i < HELD; i++) seeded.push(vote(i, SILENT, i % 2 ? "nay" : "yea"));
seeded.push(vote(90, SPOKEN, "present"));
seeded.push(vote(91, SPOKEN, "present"));
win.PDXVotingRecord.noteMember(PID, seeded);

const rows = CS.issueRows(PID);
const rowOf = (k) => rows.filter((r) => r.key === k)[0];
const silent = rowOf(SILENT), spoken = rowOf(SPOKEN);
ok(!!silent && !!spoken, "fixture: both rows are in the row model");

// One chunk per rendered row, keyed by issue.
const html = CS.stancesSectionHtml(PID);
const chunks = {};
for (const chunk of html.split(/<div class="pdxst-row["\s]/).slice(1)) {
  const k = (chunk.match(/data-pdxst-issue="([^"]*)"/) || [])[1];
  if (k) chunks[k] = chunk;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the classification separates our gap from their record");
// ═════════════════════════════════════════════════════════════════════════════
{
  const res = CS.rowResult(silent);
  eq(silent.said, false, "the seeded row genuinely has no stated position on file");
  eq(res.shape, "no_stance", "a row with instruments and no position is classified as ours to fix");
  eq(res.held, silent.evidence.actions, "the inventory count is the row's own count, not a second one");
  ok(res.held >= HELD, "every seeded instrument is counted on the face");
  has(res.why, "no stated position from them yet",
    "the reason names the missing position rather than shrugging at the record");
  has(res.why, res.held + " ", "the reason leads with what we actually hold");
  lacks(res.why, "takes a clear side",
    "the old sentence — a claim about their record that was never true here — is gone");

  // …and the other direction: a row we DO hold a position for must never be told
  // it has none. This is the false-negative that would make the new copy a lie.
  const sres = CS.rowResult(spoken);
  eq(spoken.said, true, "the control row does have a stated position on file");
  ok(sres.shape !== "no_stance", "a row with a position on file is never filed as no-position");
  lacks(sres.why, "no stated position", "…and never told the reader it has none");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · inventory on the face, and no score anywhere near it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const chunk = chunks[SILENT] || "";
  ok(!!chunk, "the no-position row is rendered");
  has(chunk, "on file", "the row states the inventory it holds");
  has(chunk, "no stated position from them yet", "…and why that inventory is not a result");
  lacks(chunk, "takes a clear side on this claim", "…without blaming the record for our gap");

  // THE ROW STAYS UNSCORED. Three ways a number could leak onto it, all closed.
  const res = CS.rowResult(silent);
  eq(res.pct, null, "the result carries no percentage");
  eq(res.state, "thin", "the row's state is unchanged — this pass moved copy, not scoring");
  eq(silent.tested, false, "the row is still not a tested row");
  eq(silent.verdict.score, null, "the verdict still holds no score");
  ok(!/class="pdxst-pct"[^>]*>\s*\d+%/.test(chunk), "no percentage is printed on the row");
  has(chunk, "pdxst-pct-na", "the result slot stays explicitly empty");
  // The count is inventory, in the office's own noun, and never a rate.
  ok(/\d+ votes on file/.test(chunk), "the count is stated as votes on file");
  lacks(chunk, "% on file", "the count is never dressed as a match rate");

  // THE WORD IS NOT A VERDICT EITHER. "Thin record" is the issue index's name for
  // a pile this row is not in, and printing it here says the record fell short
  // when what fell short is our documentation. The label states the actual fact.
  eq(res.label, "Not scored yet", "the verdict word says what is true — the row is unscored");
  lacks(chunk, "Thin record", "…and never borrows the index's name for a thin record");
  eq(res.bucket, null, "the row claims no place in the issue index's buckets");
  // The empty slot is read aloud on its own, so it carries the distinction too.
  const slot = (chunk.match(/<span class="pdxst-pct pdxst-pct-na"[^>]*>/) || [])[0] || "";
  has(slot, "no stated position to score the record against",
    "the empty result slot names our gap rather than their record");
  lacks(slot, "not enough record", "…and does not tell a screen reader the record is short");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the count is a door, and it lands on the enumeration");
// ═════════════════════════════════════════════════════════════════════════════
{
  const chunk = chunks[SILENT] || "";
  const why = (chunk.match(/<div class="pdxst-why">[\s\S]*?<\/div>/) || [])[0] || "";
  has(why, "pdxst-why-go", "the reason line carries a control");
  has(why, 'data-pdxst-dos="' + SILENT + '"', "…aimed at this issue's dossier");
  has(why, 'data-pdxst-pid="' + PID + '"', "…for this politician");
  has(why, 'data-pdxst-focus="record"', "…asking it to land on the formal list, not the top");
  has(why, "see the votes", "…and inviting the reader in the row's own noun");
  // ONE DOOR, ONE NAME. The dossier is reachable from four places and is read
  // aloud identically in all of them; a fifth entrance with its own name would be
  // a second destination as far as a screen-reader user is concerned.
  const aria = (why.match(/aria-label="([^"]*)"/) || [])[1] || "";
  has(aria, "Open the issue dossier: " + silent.label,
    "the control shares the dossier's one accessible name");

  // The destination is real: the formal enumeration exists, is addressable, and
  // lists what the face promised.
  const recs = CS.dossierRecordsHtml(PID, SILENT);
  has(recs, "data-pdxgap-record=", "the dossier's formal list is addressable");
  const items = CS.dossierItems(PID, SILENT) || [];
  eq(items.length, silent.evidence.actions,
    "the list opens onto exactly the number the row face advertised");

  // A row with nothing to show is never given the invitation.
  const sres = CS.rowResult(spoken);
  ok(!sres.invite || sres.shape === "no_stance",
    "the invitation is only ever attached to a row that holds instruments");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a truly thin row keeps its own reason");
// ═════════════════════════════════════════════════════════════════════════════
{
  const chunk = chunks[SPOKEN] || "";
  ok(!!chunk, "the control row is rendered");
  const sres = CS.rowResult(spoken);
  // The control is only a control if it is actually in the thin state — a vacuous
  // `if` here would let the copy rule rot without a failure.
  eq(sres.state, "thin", "the control row is genuinely too thin to judge");
  lacks(chunk, "no stated position from them yet",
    "a row we hold a position for is never given the no-position copy");
  ok(/(takes a clear side on this claim|takes a side on this one|is not enough to judge this one yet|Not enough record to judge this one yet)/.test(chunk),
    "…and still says, in its own terms, why it has no result");
  lacks(chunk, "pdxst-why-go", "…and offers no inventory door it cannot honour");
  // …and keeps the word and the aria it earned. The honest-word change above is
  // scoped to the no-position shape; a row that really is thin is still thin, and
  // renaming it would trade one inaccuracy for another.
  eq(sres.shape, "thin", "the control row is classified as genuinely thin");
  lacks(chunk, "Not scored yet", "a genuinely thin row does not borrow the no-position word");
  const cslot = (chunk.match(/<span class="pdxst-pct pdxst-pct-na"[^>]*>/) || [])[0] || "";
  has(cslot, "not enough record", "…and its empty slot still reads as a thin record");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the issue index never had this row to mis-word");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The two faces read the same rowResult, so a change in the classification
  // reaches both. They do not hold the same rows: ⚖️ Word vs Action is an index of
  // word-versus-action findings, and outcomeBuckets() admits no wordless row into
  // its "Thin record" pile (the `!r.stance.label` guard). That is why the false
  // sentence only ever appeared on the stance face — and why the index's own
  // "Stated, but nothing on file yet can test it" subtitle is true of every row it
  // actually shows. Pinned here so a later change to that guard cannot quietly
  // push 8,000 wordless rows into a bucket whose subtitle says they stated a
  // position.
  const idx = WA.headlineHtml(PID, win.PROFILES[PID]) || "";
  ok(!!idx, "the issue index renders");
  lacks(idx, 'data-pdxwa-issue="' + SILENT + '"',
    "a row with no stated position is not filed as a word-versus-action result");
  const guard = R("word-action.js");
  ok(/!r\.stance\.label && r\.verdict\.token === 'limited'/.test(guard),
    "the index still refuses wordless rows, which is what keeps its bucket subtitle true");
  has((WA.outcomeFor("limited") || {}).sub || "", "Stated, but",
    "…and the subtitle still describes the rows it does hold");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the score path is untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Every tested row still reports its number, and no unscored row acquired one.
  let tested = 0;
  for (const r of CS.issueRows(PID)) {
    const res = CS.rowResult(r);
    if (r.tested) {
      tested++;
      eq(typeof res.pct, "number", `${r.key}: a tested row still prints its result`);
      eq(res.metric, r.verdict.basis === "public_record" ? "Public-record match" : "Direction match",
        `${r.key}: the metric name still follows the lane that produced it`);
    } else {
      eq(res.pct, null, `${r.key}: an unscored row acquired a percentage`);
    }
  }
  const tally = CS.verdictTally ? CS.verdictTally(PID) : null;
  ok(!tally || typeof tally === "object", "the tally still answers");
  console.log(`    ${tested} tested row(s) · ${CS.issueRows(PID).length} rows in the model`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the dossier behind the door tells the same story");
// ═════════════════════════════════════════════════════════════════════════════
{
  // L1 reprints the row's reason, so it inherits the fix — but it also writes two
  // sentences of its own about the lane and the score, and both used to assert a
  // decision this row never reached.
  const l1 = CS.dossierSummaryHtml(PID, SILENT, silent) || "";
  has(l1, "no stated position from them yet", "the summary carries the row's reason");
  lacks(l1, "Decided by the formal record",
    "…and does not claim a decision on a row that reached none");
  has(l1, "would be decided by the formal record",
    "…naming the lane that would decide it instead");
  lacks(l1, "too thin to divide",
    "…and does not tell the reader their record was too thin");
  has(l1, "no stated position here to test",
    "…saying instead why the pooled figure did not move");
  lacks(l1, "Thin record", "…and never prints the index's word for a thin record");

  // The control keeps every sentence it had.
  const cl1 = CS.dossierSummaryHtml(PID, SPOKEN, spoken) || "";
  has(cl1, "Decided by the formal record", "a decided lane still says so");
  has(cl1, "too thin to divide", "…and a genuinely thin row keeps its own score line");
}

if (failures.length) {  console.error(`\n✗ thin-record honesty: ${failures.length} failure(s)`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log(`\n✓ thin-record honesty: all ${passed} assertions passed — ${HELD} held ${
  silent.lane === "exec" ? "actions" : "votes"} on ${silent.label}, stated as inventory and never as a score`);
