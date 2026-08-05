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
  ok(/window\._pdxDisplayScore/.test(PROFILES.slice(
      PROFILES.indexOf("var promiseScore ="), PROFILES.indexOf("var promiseScore =") + 500)),
    "the mandate principles read p.score raw, so 'Keeps Promises' publishes a rate the\n" +
    "    profile's own pledge lane refuses to print");

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
// They all render window._pdxLedgerSlot now — one glyph, one label, the counts —
// so this contract holds the slot honest and then checks that no caller has gone
// back to formatting a number itself.
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
  ok(/_pdxPromiseState/.test(slotDef) && /_pdxPledgeNote/.test(slotDef),
    "_pdxLedgerSlot no longer derives from the shared promise state + counts helpers, so\n" +
    "    the cards can drift from the four honest states the profile uses");
  // 'resolved' and 'counts' must be indistinguishable: the only thing that ever
  // separated them was whether a rate was published.
  const branch = slotDef.slice(slotDef.indexOf("resolved"), slotDef.indexOf("tracking"));
  ok(/state === 'resolved' \|\| state === 'counts'/.test(slotDef),
    "_pdxLedgerSlot no longer collapses 'resolved' and 'counts' into one rendering — with\n" +
    "    the rate gone an itemized ledger and a summary ledger say the same thing");

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
  const depthHead = CMP_HUB.indexOf("function _pledgeDepth");
  must(depthHead !== -1, "compare-hub.js no longer defines _pledgeDepth, the sorts' ordering key");
  const depthDef = braceScan(CMP_HUB, depthHead, "_pledgeDepth", "compare-hub.js");
  ok(/_pdxPromiseTally/.test(depthDef) && /\.resolved/.test(depthDef) && !/%/.test(depthDef),
    "the browse sorts no longer order by a resolved-pledge COUNT — ranking by the rate is\n" +
    "    publishing it, one row position at a time");
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
