#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Promise-honesty harness — the pledge percentage is retired, the counts are not
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex publishes ONE primary accountability percentage: ⚖️ Word vs Action.
// The pledge lane is the top TIER of that read, not a rival headline, so it
// publishes no percentage of its own — on any profile, for any record.
//
// This harness started from a narrower failure. A large part of the roster
// carries summary `kept` / `broken` / `pending` integers with NO itemized
// `promises[]` behind them. On those records the profile printed a follow-through
// percentage — in the hero, in the compare table's sticky header, in the compare
// row, in the mandate principles, and worked out longhand inside the ⓘ explainer
// — while the Promise Tracker directly below it rendered from `promises[]` and had
// nothing at all to show. The number was unauditable by construction: there was
// no ledger to check it against, and dividing two summary integers does not
// create one. The rule then was WITHHOLD THE RATE, KEEP THE COUNTS.
//
// The rule now goes further: RETIRE THE RATE, KEEP THE COUNTS. Even a record with
// a fully itemized ledger publishes no pledge percentage, because a second
// percentage beside Word vs Action leaves a reader unsure which number rates
// what. Contracts 5 and 7 were inverted for that — where they once required the
// itemized lane to show its earned rate, they now forbid any pledge rate at all.
// Nothing about the counts changed: they are directly attested receipts and every
// surface still shows them.
//
// The failure mode that stays live is the OVERCORRECTION, which is worse than the
// number was. Dropping the rate must not push a sitting member with 27 kept and 8
// broken into the pre-existing empty state and report "No voting record yet".
// That is why a fourth promise state ('counts') exists, and contracts 4–6 hold
// every surface to using it.
//
// Contracts:
//   1. _pdxHasItemizedPledges is honest about what an inspectable ledger is
//   2. _pdxDisplayScore withholds the rate for a counts-only record
//   3. _pdxPromiseState names four states, and 'counts' is one of them
//   4. counts-only surfaces keep their counts and never read as empty
//   5. _renderFollowThrough publishes no rate and no bar, on any record
//   6. no surface prints a pledge % at all
//  6b. the card score slots carry receipts through _pdxLedgerSlot, never a rate
//   7. the ⓘ explainer does not work the retired figure out longhand
//   8. _pdxKeyIssues resolves both roster spellings of the issue list
//
//   node scripts/test-promise-honesty.mjs
//
// No DB, no network, no browser.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}\n    got      ${JSON.stringify(a)}`);

// A probe target that has been renamed away is a STALE HARNESS, not a pass.
function must(cond, what) {
  if (!cond) {
    console.error(
      "✗ promise-honesty harness is STALE — a contract cannot be verified:\n  " + what +
      "\n\n  This is not a passing state. Restore the probe target, or update this\n" +
      "  harness AND re-check the honesty rule it describes."
    );
    process.exit(2);
  }
}

const INDEX = read("index.html");
const PROFILES = read("profiles-full.js");
const CMP_TABLE = read("compare-table.js");
const CMP_HUB = read("compare-hub.js");
const LIKE = read("like-dislike.js");
const ACCT = read("accountability-score.js");

// ── Pull real function bodies out of the sources ────────────────────────────
function braceScan(src, head, label, file) {
  const open = src.indexOf("{", head);
  must(open !== -1, `${label} in ${file} has no body`);
  let depth = 0, i = open, inStr = null, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  must(depth === 0, `could not brace-scan ${label} in ${file}`);
  return src.slice(head, i);
}
function extractFn(src, name, file) {
  const head = src.indexOf("window." + name + " = function");
  must(head !== -1, `${file} no longer defines window.${name}`);
  return braceScan(src, head, `window.${name}`, file);
}

// The guards live in index.html's inline bootstrap; the renderers live in
// profiles-full.js. Both run in one sandbox so the contracts exercise the real
// arithmetic rather than a re-implementation of it.
const FROM_INDEX = [
  "_pdxPromiseTally", "_pdxResolvedPromises", "_pdxHasPromiseRecord",
  "_pdxHasItemizedPledges", "_pdxDisplayScore", "_pdxPromiseState",
  "_pdxCountsNote", "_pdxCountsWhy", "_pdxTrackingNote",
];
const FROM_PROFILES = ["_ftMeta", "_renderFollowThrough", "_pdxKeyIssues"];

const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const n of FROM_INDEX) vm.runInContext(extractFn(INDEX, n, "index.html") + ";", sandbox);
for (const n of FROM_PROFILES) vm.runInContext(extractFn(PROFILES, n, "profiles-full.js") + ";", sandbox);
const W = sandbox.window;

// ── Fixtures ────────────────────────────────────────────────────────────────
// The counts-only shape, sized to the reference profile: summary integers with a
// real closed record and an empty pledge list. This is the record that used to
// assert a percentage its own tracker could not show.
const COUNTS_ONLY = { name: "Thomas Massie", score: 77, kept: 27, broken: 8, pending: 2, promises: [] };
// The same record with promises[] absent rather than empty — the shape most of
// the roster actually ships.
const NO_LIST = { name: "No List", score: 77, kept: 27, broken: 8, pending: 2 };
// A fully itemized record: a rate here is earned, checkable, and must still show.
const ITEMIZED = {
  name: "Itemized", score: 75, kept: 3, broken: 1, pending: 1,
  promises: [
    { title: "A", verdict: "kept" }, { title: "B", verdict: "kept" },
    { title: "C", verdict: "kept" }, { title: "D", verdict: "broken" },
    { title: "E", verdict: "pending" },
  ],
};
// Promises on file, none resolved — the pre-existing tracking state.
const TRACKING = { name: "Tracking", score: null, promises: [{ title: "A", verdict: "pending" }] };
// Nothing on file at all.
const EMPTY = { name: "Empty", score: null };

// ═════════════════════════════════════════════════════════════════════════════
// Contract 1 — what counts as an inspectable ledger
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(W._pdxHasItemizedPledges(COUNTS_ONLY), false,
    "an empty promises[] was accepted as an inspectable ledger — a rate over summary\n" +
    "    counts is exactly the unauditable figure this guard exists to withhold");
  eq(W._pdxHasItemizedPledges(NO_LIST), false,
    "a record with no promises[] at all was accepted as itemized");
  eq(W._pdxHasItemizedPledges(ITEMIZED), true,
    "a record with a populated promises[] was rejected — withholding a rate that IS\n" +
    "    checkable costs the reader real, attested substance");
  eq(W._pdxHasItemizedPledges(null), false, "a null record was accepted as itemized");
  eq(W._pdxHasItemizedPledges({ promises: [null, null] }), false,
    "a promises[] of nothing but holes was accepted as a ledger");
  // Synchronous and self-contained: promises[] is populated at template time, so
  // a guard that waited on a warm event would publish the rate on first paint.
  const src = extractFn(INDEX, "_pdxHasItemizedPledges", "index.html");
  ok(!/addEventListener|setTimeout|await|Promise\b/.test(src),
    "_pdxHasItemizedPledges became asynchronous — it is read per render, and a guard\n" +
    "    that resolves late publishes the figure it was added to withhold");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 2 — the display guard withholds the rate
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(W._pdxDisplayScore(COUNTS_ONLY), null,
    "_pdxDisplayScore published a percentage for a record whose pledge list is empty");
  eq(W._pdxDisplayScore(NO_LIST), null,
    "_pdxDisplayScore published a percentage for a record with no pledge list");
  eq(W._pdxDisplayScore(ITEMIZED), 75,
    "_pdxDisplayScore withheld a rate that has an inspectable ledger behind it");
  eq(W._pdxDisplayScore(EMPTY), null, "_pdxDisplayScore invented a figure for an empty record");
  // The guard is a gate on publication, not an edit to the data: the record still
  // carries its score, so restoring the ledger restores the number.
  eq(COUNTS_ONLY.score, 77,
    "the guard mutated the record instead of gating the render — substance must be\n" +
    "    withheld from display, never deleted from the data");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 3 — four states, and 'counts' is one of them
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(W._pdxPromiseState(COUNTS_ONLY), "counts",
    "a resolved-but-unitemized record does not report the 'counts' state, so every\n" +
    "    surface downstream has to fall back to 'empty' and claim nothing is on file");
  eq(W._pdxPromiseState(NO_LIST), "counts", "the no-promises[] shape does not report 'counts'");
  eq(W._pdxPromiseState(ITEMIZED), "resolved", "an itemized resolved record lost its 'resolved' state");
  eq(W._pdxPromiseState(TRACKING), "tracking", "the tracking state regressed");
  eq(W._pdxPromiseState(EMPTY), "empty", "the empty state regressed");
  // 'counts' must be distinguishable from BOTH neighbours, or the distinction the
  // state was added to draw does not exist.
  ok(W._pdxPromiseState(COUNTS_ONLY) !== W._pdxPromiseState(EMPTY) &&
     W._pdxPromiseState(COUNTS_ONLY) !== W._pdxPromiseState(TRACKING),
    "'counts' collapsed into 'empty' or 'tracking' — a closed record with 35 resolved\n" +
    "    promises would then read as pending or as nothing at all");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 4 — the counts survive, and no surface reads as empty
// ═════════════════════════════════════════════════════════════════════════════
{
  const note = W._pdxCountsNote(COUNTS_ONLY);
  ok(note.indexOf("27") !== -1 && note.indexOf("8") !== -1,
    `the counts note dropped the attested counts — got ${JSON.stringify(note)}`);
  ok(!/%/.test(note), `the counts note published a percentage — got ${JSON.stringify(note)}`);
  ok(/\d/.test(W._pdxCountsNote(COUNTS_ONLY, "short")),
    "the short counts note carries no figures, so a tight cell has nothing to show");
  eq(W._pdxCountsNote(ITEMIZED), "",
    "the counts note fired on an itemized record, which already shows its rate");
  eq(W._pdxCountsNote(EMPTY), "", "the counts note fired on an empty record");
  ok(W._pdxCountsWhy(COUNTS_ONLY).length > 0 && !/%/.test(W._pdxCountsWhy(COUNTS_ONLY)),
    "the counts explanation is missing or itself publishes a rate — withholding a\n" +
    "    number silently reads as an error rather than as a disclosure");

  // The hero chip must not describe a member with 35 resolved promises as having
  // no record. This is the overcorrection the 'counts' state exists to prevent.
  const heroIdx = PROFILES.indexOf("profile-status-monitoring");
  must(heroIdx !== -1, "profiles-full.js no longer renders the .profile-status-monitoring hero chip");
  const hero = PROFILES.slice(heroIdx - 400, heroIdx + 700);
  ok(/promiseState === 'counts'/.test(hero),
    "the hero chip has no 'counts' branch, so a counts-only record falls through to\n" +
    "    \"No voting record yet\" — plainly false on a member with a closed pledge record");
  ok(hero.indexOf("countsNote") !== -1,
    "the hero's counts branch does not name the counts, so the chip discloses nothing");

  // The compare surfaces, same rule.
  ok(/=== 'counts'|== "counts"/.test(CMP_HUB),
    "compare-hub.js has no 'counts' branch — a withheld rate would show there as an\n" +
    "    empty score tile beside picks that have one");
  ok(/_pdxPledgeNote/.test(CMP_TABLE),
    "compare-table.js never reads a pledge counts note, so a record with 27 kept and 8\n" +
    "    broken shows as a bare dash where the retired percentage used to be");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 5 — the pledge lane itself: no rate, no bar, no dead filter hint
// ═════════════════════════════════════════════════════════════════════════════
{
  const m = W._ftMeta(27, 8, 2, 77, false);
  eq(m.rate, null, "_ftMeta published a rate for a counts-only lane");
  eq(m.raw, null,
    "_ftMeta fell back to the raw kept/resolved ratio — that is the same unauditable\n" +
    "    percentage arrived at by division instead of by lookup");
  eq(m.itemized, false, "_ftMeta lost the itemized flag the renderer gates on");
  eq(m.countsOnly, true, "_ftMeta does not report the counts-only shape");
  eq(m.kept, 27, "_ftMeta dropped the kept count");
  eq(m.broken, 8, "_ftMeta dropped the broken count");
  eq(m.pending, 2, "_ftMeta dropped the pending count");
  ok(!/%/.test(m.verdict) && !/%/.test(m.sub),
    "the counts-only verdict or subtitle states a percentage in prose");

  // The itemized lane is untouched: the fifth argument is opt-in, so every older
  // caller behaves exactly as before.
  const mi = W._ftMeta(3, 1, 1, 75, true);
  eq(mi.rate, 75, "_ftMeta withheld a published rate that has a ledger behind it");
  const mLegacy = W._ftMeta(3, 1, 1, 75);
  eq(mLegacy.rate, 75,
    "omitting the itemized argument changed behaviour — the browse-card strip and\n" +
    "    other older callers pass four arguments and must be unaffected");

  const html = W._renderFollowThrough(27, 8, 2, "massie", 77, false);
  ok(html.length > 0, "the pledge lane vanished entirely for a counts-only record");
  ok(!/%/.test(html.replace(/width:\s*100%/g, "").replace(/max-width:\s*100%/g, "")),
    "the counts-only pledge lane printed a percentage");
  ok(html.indexOf("27") !== -1 && html.indexOf("8") !== -1,
    "the counts-only pledge lane dropped the counts it is allowed to show");
  ok(!/linear-gradient\(90deg,#16a34a/.test(html),
    "the counts-only lane still draws the split kept/broken bar — a 77/23 proportional\n" +
    "    bar is the withheld percentage rendered as geometry instead of as a number");
  ok(!/Tap a count/i.test(html),
    "the counts-only lane still offers to filter the promises below, and there is no\n" +
    "    itemized list below to filter to");
  ok(!/_pdxBadgeClick/.test(html),
    "the counts-only lane's count chips are still interactive, so they are dead buttons");
  ok(/pdx-ft-noRate/.test(html),
    "the counts-only lane has no disclosure block naming why the rate is absent");
  ok(/pdx-ft-rate-how/.test(html),
    "the ⓘ explainer is unreachable from the counts-only lane, so a reader cannot\n" +
    "    learn how the lane works at all");

  // ── THE RETIREMENT, ENFORCED ────────────────────────────────────────────────
  // The itemized lane used to be the branch that EARNED a percentage: it had an
  // inspectable ledger, so it published 75% in a disclosure. That distinction is
  // gone. The rate is retired for every record, so the itemized lane must now be
  // as silent as the counts-only one — same absence, same explanation block. If
  // this flips back, a profile has two integrity numbers again.
  const hi = W._renderFollowThrough(3, 1, 1, "someone", 75, true);
  ok(hi.length > 0, "the pledge lane vanished entirely for an itemized record");
  ok(!/%/.test(hi.replace(/width:\s*100%/g, "").replace(/max-width:\s*100%/g, "")),
    "the itemized pledge lane printed a percentage — the follow-through rate is retired\n" +
    "    for EVERY record, not just the ones whose counts could not be audited");
  ok(!/linear-gradient\(90deg,#16a34a/.test(hi),
    "the itemized lane still draws the split kept/broken bar — a 75/25 proportional bar\n" +
    "    is the retired percentage rendered as geometry instead of as a number");
  ok(/_pdxBadgeClick/.test(hi), "the itemized lane lost its clickable count chips");
  ok(hi.indexOf("3") !== -1 && hi.indexOf("1") !== -1,
    "the itemized lane dropped the counts it exists to show");
  ok(/pdx-ft-noRate/.test(hi) && !/<details class="pdx-ft-rate"/.test(hi),
    "the itemized lane still opens the pledge-only rate disclosure — both branches must\n" +
    "    now land on the same 'no percentage is published' explanation");
  ok(/Word vs Action/.test(hi),
    "the pledge lane never names the one read it feeds, so its receipts look orphaned");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 6 — every publisher routes through the guard
// ═════════════════════════════════════════════════════════════════════════════
{
  // The profile passes the flag down to the renderer. Without it the lane defaults
  // to legacy behaviour and prints the rate again.
  ok(/_pdxHasItemizedPledges/.test(PROFILES),
    "profiles-full.js never consults the itemized guard");
  ok(/_renderFollowThrough\([\s\S]{0,220}?pledgeItemized/.test(PROFILES),
    "the profile calls _renderFollowThrough without the itemized flag, so the pledge\n" +
    "    lane silently reverts to publishing the rate");
  // This used to pin the People's Mandate scorecard's "Keeps Promises" tile to
  // the display guard: `var promiseScore = window._pdxDisplayScore(p)`, so the
  // tile could not print a rate the pledge lane on the same profile withholds.
  // The scorecard is gone — it also carried two tiles fed by the retired
  // Accountability composite and an averaged overall on top of them — so there is
  // no tile left to guard. The stronger invariant is that the publisher itself
  // cannot come back: no promiseScore local, and no N/100 tile in the block that
  // replaced it.
  ok(PROFILES.indexOf("var promiseScore =") === -1,
    "profiles-full.js computes a promiseScore local again — that variable existed only\n" +
    "    to feed a scorecard tile with a pledge rate");
  {
    const i = PROFILES.indexOf("window._renderMandateAlignment = function");
    ok(i > 0, "profiles-full.js no longer defines _renderMandateAlignment");
    const body = PROFILES.slice(i, PROFILES.indexOf("window._ftMeta =", i));
    ok(!/\/100/.test(body),
      "the Follow the Money block prints an N/100 again — the scorecard's rated tiles\n" +
      "    are retired and nothing there may publish a 0-100 grade");
    ok(!/accountability/i.test(body.replace(/^\s*\/\/.*$/gm, "")),
      "the Follow the Money block reads the accountability object again — it is a\n" +
      "    funding lens, and the composite it used to average in is retired");
  }

  // The compare table had three independent publishers: the sticky column header,
  // the Promise Follow-Through row, and the Bottom Line verdict's prose. All three
  // are retired rather than guarded — the table compares pledge COUNTS now, and
  // its Bottom Line judges on ⚖️ Word vs Action, the one published read. So what
  // this checks is that none of the three can come back: no local division of the
  // kept / broken pair anywhere in the file, and no `p.score` read in the header.
  const cmpNoComments = CMP_TABLE.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  ok(CMP_TABLE.indexOf("const followThrough = ") === -1,
    "compare-table.js defines followThrough() again — that helper existed only to\n" +
    "    divide two summary integers into the retired pledge percentage");
  ok(!/100\s*\*\s*p\.kept|p\.kept\s*\/\s*\(/.test(cmpNoComments),
    "compare-table.js divides the kept / broken pair into a rate again — computing the\n" +
    "    retired figure locally does not make it publishable");
  const verdictDef = CMP_TABLE.slice(CMP_TABLE.indexOf("function _cmpVerdictWordAction"),
                                     CMP_TABLE.indexOf("function _cmpVerdictIsCandidate"));
  must(verdictDef.length > 20, "compare-table.js no longer defines _cmpVerdictWordAction");
  ok(/PDXWordAction/.test(verdictDef) && !/p\.kept/.test(verdictDef),
    "the Bottom Line verdict's record basis is not the published Word vs Action read —\n" +
    "    a percentage phrased conversationally is still published, so it has to be the\n" +
    "    same one the profile shows");
  ok(!/const sc_val = p\.score;/.test(CMP_TABLE) && !/cmp-col-score-ring/.test(cmpNoComments),
    "the compare table's sticky column header carries a score ring again — the header\n" +
    "    was the table's loudest percentage and it reports pledge counts now");

  // The Accountability of Truth report quotes the keep rate in three sentences.
  ok(/pkQuotable/.test(ACCT),
    "accountability-score.js quotes the kept/resolved keep rate unconditionally");
  const quoted = ACCT.split("promiseKeeping + \"%\"").length - 1
                + ACCT.split("promiseKeeping + '%'").length - 1;
  eq(quoted, 0,
    "a keep-rate percentage is still concatenated unguarded in accountability-score.js —\n" +
    "    every quotation of it has to sit behind pkQuotable");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 6b — the card score SLOTS carry receipts, and cannot hold a rate
// ═════════════════════════════════════════════════════════════════════════════
// Contract 6 covers the profile and the compare table. It missed the listing
// cards, and they were the largest remaining publisher by reach: every card had
// its own copy of `sc + '%'`, its own colour ramp and its own fallback, so the
// pledge rate survived the profile's retirement on the browse grid, both My Team
// views, the My Politicians card, the medium modal, the Relevant-to-Me dual
// signal, the Key Races cell, the ballot summary and the Your Ballot chip.
//
// They all render window._pdxLedgerSlot, so this contract holds the slot honest
// and then checks that no caller has gone back to formatting a number itself.
//
// AMENDED. This contract used to REQUIRE the slot to derive from the pledge-lane
// helpers (`_pdxPromiseState` + `_pdxPledgeNote`) and to collapse the ledger's
// 'resolved'/'counts' states into one rendering. Both were the right rule while
// the slot WAS the pledge lane: they stopped it publishing a rate. They are the
// wrong rule now. A pledge is one form of "said" — word-action.js already tests
// it against its sourced resolution — so a pledge ledger in the slot every card
// treats as the finding is the one system's own evidence presented as a rival to
// it. The slot now renders ⚖️ Word vs Action, and the assertions below enforce
// the stronger version of the same honesty: it must read the shared engine, it
// must fail closed on that engine's floor, and it must not touch the tally.
{
  const YB = read("your-ballot.js");
  const BB = read("ballot-breakdown.js");
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "")
                            .replace(/(^|[^:])\/\/.*$/gm, "$1");

  // ── The slot itself ──
  const slotDef = extractFn(CMP_HUB, "_pdxLedgerSlot", "compare-hub.js");
  must(slotDef.length > 100, "compare-hub.js no longer defines window._pdxLedgerSlot");
  ok(!/%/.test(slotDef),
    "_pdxLedgerSlot can produce a percent sign — it is the one thing every card score\n" +
    "    slot now routes through, so a rate here is a rate everywhere at once");
  ok(!/\.score\b|_pdxDisplayScore/.test(slotDef),
    "_pdxLedgerSlot reads the stored pledge score — the slot is built from the tally, so\n" +
    "    the retired figure must not be in its hands at all");
  ok(/PDXWordAction/.test(slotDef) && /\.read\s*\(/.test(slotDef),
    "_pdxLedgerSlot no longer reads PDXWordAction — every card score slot routes through\n" +
    "    this function, so if it does not render the one read, the app's most-seen surface\n" +
    "    is publishing something else");
  ok(/publishable/.test(slotDef),
    "_pdxLedgerSlot does not gate on `publishable` — PDXWordAction owns when a read is\n" +
    "    sayable, and a card is the last place that should second-guess the floor");
  ok(/Word vs Action/.test(slotDef) && !/'Pledge record'|Pledges tracked|label: 'Pledges'/.test(slotDef),
    "_pdxLedgerSlot labels the slot with pledge vocabulary again — one slot, one\n" +
    "    vocabulary; 'Pledge record' beside a profile that leads with Word vs Action is\n" +
    "    two integrity languages in the same product");
  ok(!/_pdxPromiseState|_pdxPledgeNote|_pdxCountsNote|_pdxTrackedCountLabel|_pdxPromiseTally/.test(slotDef),
    "_pdxLedgerSlot reaches for the pledge-lane helpers again — those publish the ledger's\n" +
    "    receipts, which belong on the profile beside their own disclosure, not in the slot\n" +
    "    a reader treats as the finding");

  // ── The callers ──
  for (const [file, src] of [["compare-hub.js", CMP_HUB], ["ballot-breakdown.js", BB], ["your-ballot.js", YB]]) {
    const code = strip(src);
    ok(!/_pdxDisplayScore\([^)]*\)\s*(\+|\?)[\s\S]{0,80}?'%'/.test(code),
      `${file} formats _pdxDisplayScore into a percent string again`);
    ok(!/(sc|dsc|scTxt|dScore|avgScore)\s*\+\s*'%'/.test(code),
      `${file} concatenates a pledge score with '%' again — that is the exact shape every\n` +
      `    card slot used before it routed through _pdxLedgerSlot`);
    ok(!/Promise Score|Avg Promise Score|% Promise/.test(code),
      `${file} labels a slot "Promise Score" again — the label is what told the reader the\n` +
      `    number beside it was a rating, and there is no rating in this lane`);
    // The raw field, bypassing the guard entirely. A "(Promise 77%)" tacked onto a
    // sentence is the same published rate as the one that used to sit in the ring,
    // and _pdxDisplayScore's bans above do not see it.
    ok(!/\b(d|p|cd|rec)\.score\s*\+\s*'%/.test(code),
      `${file} interpolates the raw p.score field into a percent string — the stored number\n` +
      `    stays in the data layer, but no surface may publish it`);
  }
  // The retired colour ramps are gone, not merely unused: a live ramp keyed on a
  // score is the easiest way for the number to come back.
  ok(!/function _scoreColor|function _krScoreColor/.test(BB),
    "ballot-breakdown.js still defines a pledge-score colour ramp — colouring a slot by a\n" +
    "    rate publishes the rate");
  ok(!/function scoreColor/.test(YB),
    "your-ballot.js still defines a pledge-score colour ramp");
  // A progress bar IS a percentage, drawn. The My Team slot card had one.
  ok(!/bar-high|bar-mid|bar-low/.test(strip(CMP_HUB)),
    "compare-hub.js draws a pledge-score progress bar again — a bar is a percentage with\n" +
    "    the digits taken off, not an alternative to one");
  // Filtering, sorting and colouring are USES of a score. The three pledge-rate
  // colour ramps (_chubScoreColor / _medScoreColor / _bsScoreColor) are gone, and
  // the shape they shared — a threshold picking a hex colour — must not come back.
  // Matched on that shape rather than on ">= 70" alone: compare-hub also thresholds
  // the ALIGNMENT match at 70 and colours the average alignment on a ramp, which is
  // a different score and a legitimate one — hence the pledge-score variable names.
  ok(!/\b(s|sc|dsc|score|dScore|avgScore|promiseScore)\s*>=\s*(70|50|40)\s*\?\s*'#/.test(strip(CMP_HUB)),
    "compare-hub.js grades a pledge score with a colour ramp again — green/amber/red over\n" +
    "    kept ÷ resolved is the percentage with the digits taken off");
  ok(!/function _(chub|med|bs)ScoreColor/.test(CMP_HUB),
    "compare-hub.js redefines one of the retired pledge-rate colour ramps");
  ok(!/70%\s*\+|40\s*[-–]\s*69|Under 40%/.test(strip(CMP_HUB)),
    "compare-hub.js offers a pledge-rate band as a filter label again — '70%+' republishes\n" +
    "    the number the app stopped publishing, and ranks people by it");
  // The pasted-slate path is a share surface too: a rate with no denominator travels
  // further in plain text than it does on screen.
  ok(!/%\s*promise\s*score/i.test(strip(CMP_HUB)),
    "the ballot-summary clipboard text carries a pledge percentage again — pasted text has\n" +
    "    no methodology link to sit next to");
  // ONE RANKING SYSTEM. This contract used to require the two "score" sorts to
  // order by a resolved-pledge COUNT — the honest replacement for the retired
  // pledge RATE, and correct as far as the rate went. It was still a ranking of
  // every politician in the app by their pledge tally, offered under the label
  // "🤝 Most Pledge Receipts": a separate ranking system for pledges, wearing a
  // count instead of a percentage. It also rewarded whoever had the most pledges
  // transcribed rather than whoever's record backs their word.
  //
  // A pledge is one FORM OF "said" and word-action.js already tests it, so the
  // ordering key is now the one published read and the pledges are inside it.
  const depthHead = CMP_HUB.indexOf("function _waDepth");
  must(depthHead !== -1, "compare-hub.js no longer defines _waDepth, the sorts' ordering key");
  const depthDef = braceScan(CMP_HUB, depthHead, "_waDepth", "compare-hub.js");
  ok(/PDXWordAction/.test(depthDef) && /\.pct/.test(depthDef),
    "the browse sorts no longer order by the ⚖️ Word vs Action read — the ordering key IS a\n" +
    "    ranking system, so it has to be the one PolitiDex publishes");
  ok(/publishable/.test(depthDef) && /return\s+-1/.test(depthDef),
    "the sort's ordering key ignores the publishing floor — a record too thin to read would\n" +
    "    be ranked anyway, which is the floor defeated one row position at a time");
  ok(!/_pdxPromiseTally|\.resolved|\.kept|\.broken/.test(depthDef),
    "the browse sorts order by a pledge tally again — ranking the whole roster by kept /\n" +
    "    broken / resolved is a second ranking system whatever the option label says");
  // Stripped first: the retirement is RECORDED above _waDepth() with a tombstone
  // naming the function it replaced, and a probe that cannot tell the tombstone
  // from a live call would report the fix as the regression.
  ok(!/_pledgeDepth\s*\(/.test(strip(CMP_HUB)),
    "compare-hub.js still calls the retired pledge-tally ordering key");
  // The option a visitor actually reads. Ranking by the one read but labelling the
  // option "Most Pledge Receipts" would leave the second system standing in the UI.
  ok(!/Most Pledge Receipts/.test(INDEX),
    "the browse sort still offers '🤝 Most Pledge Receipts' — the label is the ranking system\n" +
    "    as far as a visitor is concerned, whatever the comparator now does");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 7 — the explainer explains receipts, and works no figure out longhand
// ═════════════════════════════════════════════════════════════════════════════
{
  const info = LIKE.slice(LIKE.indexOf("window._pdxPromiseInfo = function"),
                          LIKE.indexOf("window._pdxScoreCompareInfo = function"));
  must(info.length > 100, "like-dislike.js no longer defines _pdxPromiseInfo");
  // Comments stripped first: the retirement is RECORDED here with a tombstone that
  // quotes the formula it removed, and a probe that cannot tell the tombstone from
  // the body would report the fix itself as the regression.
  const body = info.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  ok(/_pdxHasItemizedPledges/.test(body),
    "the ⓘ promise explainer no longer distinguishes an itemized ledger from bare\n" +
    "    summary counts, so it tells a reader to go and inspect a list that is not there");
  // The retirement's most important single site. This popover is opened BY someone
  // who wants a number, which makes it the last place a retired score survives —
  // once as the general formula, once as this official's own division.
  ok(!/%/.test(body),
    "the promise explainer prints a percentage — it is opened by a reader looking for a\n" +
    "    number, so a rate surviving here defeats the retirement everywhere else");
  ok(!/÷/.test(body),
    "the promise explainer still shows Kept ÷ (Kept + Broken) — a formula published in a\n" +
    "    popover is the score published in a popover");
  ok(!/_pdxDisplayScore/.test(body),
    "the promise explainer reads the stored promise figure again; the counts are what it\n" +
    "    is allowed to name");
  ok(/Word vs Action/.test(body),
    "the promise explainer never says where kept and broken pledges actually go, which is\n" +
    "    the whole reason the separate grade was retired");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 7b — ONE INTEGRITY SYSTEM: no pledge tally in a summary/score slot
// ═════════════════════════════════════════════════════════════════════════════
// Contracts 1–7 retired the pledge RATE. They did not stop the app ranking and
// summarising people by the pledge COUNT, which is the same second system with
// the division taken out. Every offender had the same shape: a kept/broken tally
// sitting in the slot on a card that a reader treats as the finding.
//
//   • Key Races cards       — a gold `kr-score-promise` cell, "PLEDGES ⓘ / ✓6 ✕3",
//                             which (once the Truth Score cell was retired) was
//                             the ONLY score-styled cell on the card.
//   • My Team summary box   — a "Pledge Receipts" stat tile summing resolved
//                             pledges across six different people.
//   • Ballot pick cards     — "6 kept · 3 broken" as the card's only signal line.
//   • Compare insights      — a "🤝 Promise Receipts" card whose lead was a pooled
//                             `12 kept · 4 broken` plus a "deepest record" ranking.
//   • Compare Bottom Line   — "…with 6 kept and 3 broken pledges on file" appended
//                             to the sentence stating the Word vs Action read.
//   • District-tree cards   — the `pm-card-score` slot, labelled "Pledges settled".
//   • Browse sorts          — the roster ordered by pledge receipts (Contract 6).
//
// A pledge is one FORM OF "said". word-action.js tests a `pledge-tracked` item
// against its sourced resolution exactly as it tests a floor stance, so all of
// these now carry the ⚖️ Word vs Action verdict. The pledge data, the accessors
// and the Kept/Broken/Pending logic are untouched and still published on each
// profile beside their own disclosure — what is gone is the parallel tally in the
// slot that reads as the score.
//
// These probes are SHAPE-based, not word-based. "kept" and "broken" are legitimate
// ledger prose ("Resolved in the pledge ledger as broken") and legitimate evidence
// pills; banning the words would forbid the very said-vs-action evidence the one
// system is built on. What must not exist is a tally in a score slot.
{
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "")
                            .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const BB2 = strip(read("ballot-breakdown.js"));
  const CT2 = strip(CMP_TABLE);

  // ── Key Races: one cell, and it is the one read ──────────────────────────
  const krHead = BB2.indexOf("function _krScoreCells");
  must(krHead !== -1, "ballot-breakdown.js no longer defines _krScoreCells");
  const kr = braceScan(BB2, krHead, "_krScoreCells", "ballot-breakdown.js");
  ok(/PDXWordAction/.test(kr) && /publishable/.test(kr),
    "the Key Races score cell does not carry the ⚖️ Word vs Action read — with the Truth\n" +
    "    Score cell retired this is the only score-styled cell on the card, so whatever it\n" +
    "    shows IS the Key Races score");
  ok(!/_pdxPromiseTally/.test(kr),
    "the Key Races score cell reads the pledge tally again — a kept/broken count in the\n" +
    "    card's one score cell is a second ranking system for pledges");
  ok(!/✓'\s*\+|✕'\s*\+|kept\/broken/.test(kr),
    "the Key Races cell paints ✓kept / ✕broken counts again");
  ok(!/#4ade80|#f87171/.test(kr),
    "the Key Races cell hard-codes the green/red pledge palette — the only good/bad colour\n" +
    "    allowed here is the verdict's own, from PDXConsistency.VERDICTS");
  ok(!/kr-score-promise/.test(kr) && !/kr-score-promise/.test(strip(read("app.css"))),
    "the gold `kr-score-promise` treatment is back — a ready-made 'score' style is the\n" +
    "    easiest thing on this surface to reach for the next time something wants to rank");

  // ── My Team: the summary band, and the pick cards ────────────────────────
  ok(!/Pledge Receipts<\/div>|myteam-stat-label">Pledge/.test(BB2),
    "the My Team summary box shows a 'Pledge Receipts' tile again — a tally pooled across a\n" +
    "    whole slate, in the summary band, reads as the slate's score");
  const waLineHead = BB2.indexOf("function _bbWaLine");
  must(waLineHead !== -1, "ballot-breakdown.js no longer defines _bbWaLine, the ballot cards' one line");
  const waLine = braceScan(BB2, waLineHead, "_bbWaLine", "ballot-breakdown.js");
  ok(/PDXWordAction/.test(waLine) && /publishable/.test(waLine),
    "the ballot cards' signal line does not carry the ⚖️ Word vs Action read");
  ok(!/_pdxPromiseTally|\.kept|\.broken/.test(waLine),
    "the ballot cards' one signal line prints a kept/broken tally again — it is the only\n" +
    "    thing on the card, so a voter comparing two picks would be comparing pledge counts");
  ok(!/function _bbLedgerLine/.test(BB2),
    "the retired `_bbLedgerLine` tally is back in ballot-breakdown.js");

  // ── Compare: the insight panel, the Bottom Line, the roster card ─────────
  ok(!/Promise Receipts<\/div>/.test(CT2),
    "the compare insight panel offers a '🤝 Promise Receipts' card again — a tally pooled\n" +
    "    across picks, in the lead slot of a comparison insight, one card from the read it\n" +
    "    is supposed to be subordinate to");
  ok(/cmp-insight-title">⚖️ Word vs Action/.test(CT2),
    "the compare insight panel no longer reports the ⚖️ Word vs Action read across the\n" +
    "    lineup — removing the pledge card without putting the one read in its place just\n" +
    "    leaves the comparison with no integrity signal at all");
  ok(!/function _cmpVerdictPledges/.test(CT2),
    "`_cmpVerdictPledges` is back — its only caller appended a second set of counts to the\n" +
    "    sentence that states the one verdict");
  ok(!/kept<\/strong>/.test(CT2),
    "the compare Bottom Line appends a kept/broken tally to the Word vs Action sentence\n" +
    "    again — the most expensive place on this surface to make a reader choose between\n" +
    "    two numbers");
  ok(!/pm-card-score-label">Pledges/.test(CT2),
    "the district-tree card's score slot is labelled with pledge vocabulary again");
  ok(/pm-card-score-label">Word vs Action/.test(CT2),
    "the district-tree card's score slot no longer carries the one read");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 7c — THE UNIFIED COMPACT CARD SHELL speaks the one language
// ═════════════════════════════════════════════════════════════════════════════
// `window._pdxCardInner` is the single most-rendered markup in the product: All
// Politicians, Search results, Compare, Favorites, My Politicians, Watching,
// Relevant to Me and every Related grid draw it verbatim. That makes it the app's
// de-facto headline accountability signal regardless of what any profile page
// says — and its score rail was a four-state pledge tile (🤝 "Pledge record" /
// 🗳️ "2026 Ballot" / ⏳ "N pledges tracked" / — "Promise") with a kept/broken
// pill row under it, tapping through to the pledge-lane explainer.
//
// Contract 7b swept the summary card and six other surfaces. This one holds the
// shell, and it is the load-bearing case: a regression here reappears on every
// listing in the app at once.
//
// Note the probes are SHAPE-based, not word-based. "kept" and "broken" are
// legitimate ledger prose everywhere else in the codebase ("Resolved in the
// pledge ledger as broken, against its own sources") — banning the words would
// forbid the said-vs-action evidence the one system is built on. What is banned
// is the tally SHAPE in the rail and the pill row: `'✓ ' + n + ' Kept'`.
{
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "")
                            .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const CH = strip(CMP_HUB);
  const CSS = strip(read("app.css"));
  // Brace-scan the STRIPPED source, not the raw file. compare-hub.js has line
  // comments containing bare apostrophes ("needs the user's stances"), and
  // braceScan tracks string state without stripping comments — so one of those
  // opens a phantom string literal that swallows the next `{` and the scan runs
  // past the function's real end. On the raw file `_pdxStatPills` extracts as
  // 38KB instead of 3KB, which would quietly weaken every ban probe below into a
  // search of half the module. Stripping first is what makes the bodies exact.
  const body = (name) => {
    const head = CH.indexOf("window." + name + " = function");
    must(head !== -1, `compare-hub.js no longer defines window.${name}`);
    return braceScan(CH, head, "window." + name, "compare-hub.js");
  };

  // ── The rail ──
  const inner = body("_pdxCardInner");
  must(inner.length > 500, "window._pdxCardInner's body did not extract");
  const innerCode = inner;

  ok(/PDXWordAction/.test(innerCode) && /\.read\s*\(/.test(innerCode),
    "the unified compact card shell no longer reads PDXWordAction — every dense listing in\n" +
    "    the app renders this markup, so whatever fills its score rail IS the product's\n" +
    "    headline integrity signal");
  ok(/publishable/.test(innerCode),
    "the compact card rail does not gate on `publishable` — PDXWordAction owns the floor,\n" +
    "    and a 62px tile in a grid is the worst possible place to publish a verdict that\n" +
    "    the engine has already judged unsayable");
  ok(/pdx-snap-score-lbl[^>]*>Word vs Action|>Word vs Action</.test(inner),
    "the compact card rail no longer labels itself 'Word vs Action' — one slot, one\n" +
    "    vocabulary, on the surface a voter sees most");
  ok(!/Pledge record|pledges tracked|>Pledges<|scoreLabel/i.test(innerCode),
    "the compact card rail carries pledge vocabulary again ('Pledge record' / 'Pledges\n" +
    "    tracked' / a `scoreLabel` override) — that is the retired pledge tile returning to\n" +
    "    the slot the one read now occupies");
  ok(!/🤝/.test(innerCode),
    "the 🤝 pledge glyph is back in the compact card shell — the glyph in this slot is the\n" +
    "    verdict's own, from PDXConsistency.VERDICTS, or a coverage state; a lane emoji here\n" +
    "    tells the reader a lane is being rated");
  ok(!/_pdxPromiseState|_pdxPledgeNote|_pdxCountsNote|_pdxTrackingNote|_pdxTrackedCountLabel/.test(innerCode),
    "the compact card shell reaches for the pledge-lane note helpers again — they publish\n" +
    "    the ledger's receipts, which belong on the profile beside their own disclosure");
  ok(!/_pdxPromiseInfo/.test(innerCode),
    "the compact card rail taps through to the pledge-lane explainer again — the ⓘ on this\n" +
    "    tile must describe the read the tile is actually showing, or the affordance itself\n" +
    "    is the second system");
  ok(/_pdxScoreCompareInfo/.test(innerCode),
    "the compact card rail has no explainer wired up — the one read is the thing that most\n" +
    "    needs explaining, and this is where most readers meet it");

  // Fail-closed coverage prose, not a hollow grade. These exact strings are what
  // the request names as the honest below-floor language.
  ok(/Not enough record yet/.test(inner),
    "the compact card rail no longer states 'Not enough record yet' below the floor — the\n" +
    "    alternative is a rail that looks like a grade on evidence the engine rejected");
  ok(/Record begins in office/.test(inner),
    "the compact card rail no longer preserves the candidate coverage line 'Record begins\n" +
    "    in office' — a 2026 candidate has no governing record, and 'no record' reads as a\n" +
    "    failing grade instead of a fact about the calendar");
  ok(/No stated positions yet/.test(inner),
    "the compact card rail has no honest state for a politician with nothing on file");

  // ── The pill row: tally suppressed, status prose preserved ──
  ok(/tally:\s*false/.test(innerCode),
    "the compact card shell no longer suppresses the kept/broken pill row — those pills sat\n" +
    "    one line under the rail, grading the same pledges the rail's read already measures");
  const pills = body("_pdxStatPills");
  must(pills.length > 200, "window._pdxStatPills' body did not extract");
  ok(/tally\s*===\s*false/.test(pills),
    "_pdxStatPills no longer honours `opts.tally: false` — the compact shell passes it, so\n" +
    "    losing the mode silently restores the tally on every listing in the app");
  // The status prose is NOT a score and must survive intact — the request is
  // explicit that these lines stay.
  for (const line of [
    "Lost primary — not on the November ballot",
    "Withdrew before taking office — no record",
    "Did not advance — never took office",
    "2026 candidate — record starts in office",
    "Candidate — no voting record yet",
    "Former office — record archived",
    "Early in term — record being tracked",
  ]) {
    ok(pills.includes(line),
      `_pdxStatPills dropped the status line "${line}" — it is coverage prose, not a tally,\n` +
      "    and it is the only thing telling a reader why the record looks the way it does");
  }
  // The status-only branch must not fall through into ledger vocabulary.
  const tallyOff = pills.slice(pills.indexOf("tally === false"), pills.indexOf("if (resolved > 0)"));
  ok(!/Kept|Broken|None resolved yet/.test(tallyOff),
    "_pdxStatPills' status-only mode emits ledger counts — the whole point of the mode is\n" +
    "    that a caller can have the status prose WITHOUT the ratio");

  // ── Coverage as supporting evidence, never a grade ──
  const cov = body("_pdxCoveragePill");
  must(cov.length > 80, "window._pdxCoveragePill' body did not extract");
  ok(/publishable/.test(cov),
    "_pdxCoveragePill publishes a coverage figure without checking `publishable` — below\n" +
    "    the floor the rail already states the coverage gap, and a bare fraction beside it\n" +
    "    reads as a score");
  ok(!/%/.test(cov),
    "_pdxCoveragePill can produce a percent sign — coverage is a fraction of what is KNOWN,\n" +
    "    not of merit; rendered as a percentage it becomes a second rate");
  ok(/pdx-statpill-cov/.test(cov) && /\.pdx-statpill-cov/.test(CSS),
    "the coverage pill has no neutral class of its own — reusing kept/broken styling would\n" +
    "    paint a coverage figure in a good/bad palette");
  ok(!/#4ade80|#f87171|#22c55e/.test(cov),
    "_pdxCoveragePill paints itself green or red — that is a grade, and coverage is not one");

  // ── The other rails that render the same slot ──
  // These are the _pdxLedgerSlot consumers. If any of them still branches on the
  // retired 'ledger' state, it renders a pledge layout around a Word vs Action
  // payload — worse than either system alone.
  ok(!/state\s*===\s*'ledger'/.test(CH),
    "a card still branches on `_pdxLedgerSlot`'s retired 'ledger' state — that branch was\n" +
    "    the pledge-counts layout, and the slot no longer returns pledge counts to put in it");
  ok(!/state\s*===\s*'ledger'/.test(strip(read("your-ballot.js"))),
    "the Your Ballot chip still branches on the retired 'ledger' state");
  // Every _pdxLedgerSlot call must pass a pid: without one there is no action
  // half to test the word against, and the slot fails closed to "no read" — which
  // would silently blank the rail on that surface rather than break loudly.
  const calls = CH.match(/_pdxLedgerSlot\(([\s\S]*?)\)\s*(?:;|:|\n)/g) || [];
  ok(calls.length >= 5,
    `expected the shared slot to still have its callers (found ${calls.length}) — this probe\n` +
    "    is how the pid requirement below is enforced across all of them");
  for (const c of calls) {
    if (/=\s*function/.test(c)) continue;            // the definition itself
    ok(/pid\s*:/.test(c),
      "a _pdxLedgerSlot caller omits `pid` — PDXConsistency.officialRecord(pid, issueKey) is\n" +
      "    the action half of the read, so a pid-less call cannot test anything and the rail\n" +
      "    silently degrades to 'no read' on that whole surface:\n    " + c.trim().slice(0, 120));
  }

  // ── The Relevant-to-Me dual signal ──
  // Two equal-weight cells under "Does what they say match what they do?" — one
  // of them was a pledge lane, which is the two-ranking-systems read in its most
  // literal form.
  const dualHead = CH.indexOf("function _relevantDualSignal");
  must(dualHead !== -1, "compare-hub.js no longer defines _relevantDualSignal");
  const dual = braceScan(CH, dualHead, "_relevantDualSignal", "compare-hub.js");
  must(dual.length > 200, "_relevantDualSignal's body did not extract");
  ok(!/Pledge receipts/.test(dual),
    "the Relevant-to-Me dual signal offers a '🤝 Pledge receipts' cell again — equal weight,\n" +
    "    equal size, directly beside the consistency read, under a header asking the one\n" +
    "    question both cells now answer at different scopes");
  ok(/rel-dual-ico">⚖️<\/span> Word vs Action/.test(dual),
    "the Relevant-to-Me dual signal's left cell no longer carries the ⚖️ Word vs Action read");

  // ── The CSS ──
  ok(/\.pdx-snap-score-wa\b/.test(CSS),
    "app.css has no `.pdx-snap-score-wa` rail variant — the shell references it, so the\n" +
    "    most-rendered tile in the app would fall back to unstyled");
  ok(!/\.pdx-snap-score-wa[^{]*\{[^}]*(#4ade80|#f87171|#22c55e|#facc15)/.test(CSS),
    "the Word vs Action rail variant paints its own good/bad colour — the only verdict\n" +
    "    colour on this tile must be the verdict's own, set inline from\n" +
    "    PDXConsistency.VERDICTS; a ramp in the stylesheet is a second palette");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 8 — the issue roster reads both spellings
// ═════════════════════════════════════════════════════════════════════════════
{
  // Roster records store the curated list as `issues`; Firestore-backed and
  // admin-authored records store it as `keyIssues`. Reading only one spelling is
  // why 🎯 Key Issues rendered blank for the entire static roster.
  const four = ["Fiscal Responsibility", "Constitutional Rights", "Government Overreach", "Agriculture"];
  const a = W._pdxKeyIssues({ issues: four });
  eq(a.length, 4, "the `issues` spelling does not resolve, so the whole static roster stays dark");
  eq(a[0], four[0], "the resolved list is not the record's own list");
  eq(W._pdxKeyIssues({ keyIssues: four }).length, 4,
    "the `keyIssues` spelling does not resolve, so Firestore and admin records go dark");
  eq(W._pdxKeyIssues({ issues: ["a"], keyIssues: ["x", "y"] })[0], "a",
    "precedence changed — `issues` must win, matching the page shell's own\n" +
    "    `p.issues || p.keyIssues` ordering");
  // Always an array, so no caller needs its own guard before .length / .map.
  for (const shape of [null, undefined, {}, { issues: [] }, { issues: "nope" }, { keyIssues: null }]) {
    ok(Array.isArray(W._pdxKeyIssues(shape)),
      `_pdxKeyIssues returned a non-array for ${JSON.stringify(shape)} — callers index it\n` +
      "    directly and would throw");
  }
  eq(W._pdxKeyIssues({ issues: [] }).length, 0, "an empty list resolved to something non-empty");

  // The section gate has to read the accessor, not the record field, or the fix is
  // dead the moment the template is edited. Comments are stripped first: the fix is
  // recorded with a comment quoting the old gate, and a probe that cannot tell the
  // tombstone from the body would report the fix itself as the regression.
  const PROFILES_CODE = PROFILES.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  ok(!/p\.keyIssues && p\.keyIssues\.length/.test(PROFILES_CODE),
    "the Key Issues section still gates on p.keyIssues directly, which is false for\n" +
    "    every roster record");
  for (const [file, src] of [["profile-spine.js", read("profile-spine.js")],
                             ["stance-helpers.js", read("stance-helpers.js")]]) {
    ok(/_pdxKeyIssues|p\.issues/.test(src),
      `${file} still reads only p.keyIssues, so its issue fallback is dead for the roster`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ promise honesty: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`✓ promise honesty: ${passed} assertions passed`);
