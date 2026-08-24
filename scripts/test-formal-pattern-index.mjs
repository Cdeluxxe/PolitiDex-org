#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-formal-pattern-index.mjs — every issue the formal record touched, listed
// ─────────────────────────────────────────────────────────────────────────────
// Slice 3 of the Vote Pattern Index, and an INDEXING slice only. Slice 1 gave the
// silent rows a prose clause; slice 2 put a five-rung pattern chip on the row
// faces; this one answers the question those two exposed — "where is the list?"
//
// "Full Stance Record" was built from documented stance cards, the evidence map
// and the receipt-depth index: three CURATED sources. On Schumer that is seven
// issues, under a title promising the complete picture, while his roll-call record
// runs across sixty-one. This is the other list, and everything below is the fence
// that keeps a longer list from also being a louder claim:
//
//   1. IT IS THE LONGER LIST, AND IT IS REAL. One row per issue with a pattern
//      read or formal instruments on file — far past the written cards.
//   2. PATTERN-ONLY ROWS ARE FIRST-CLASS. An issue where the record spoke and
//      nobody wrote down what they said is a FINDING, in the default view and
//      behind its own filter — never folded in with "gaps".
//   3. STATED + PATTERN ROWS SHOW BOTH, pattern first, neither derived from the
//      other.
//   4. THIN STAYS THIN. Its own word, its own weight, sorted below the deep
//      tiers, and never worded as a tendency.
//   5. EVERY ROW IS A DOOR into the dossier — the same delegated handler the
//      stance rows use, on the row's own id.
//   6. IT FAILS CLOSED. No formal signal, no row. No readable side, no direction
//      — and the exec lane says so in its own words rather than borrowing a verb.
//   7. IT IS NOT A SCORE. No percentage anywhere in it, no position map touched,
//      and Direction Match is byte-identical with the whole derivation switched
//      off.
//   8. IT IS FORMAL-LANE ONLY, and it never mentions a party.
//
//   node scripts/test-formal-pattern-index.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// profiles-full.js is on this list and on no other harness's: the surface this
// slice mounts into lives there, and asserting the mount from the engine side
// only would leave the actual overlay untested.
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
  "profiles-full.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A fixture that no longer offers a case is a silent pass, so the probes that
// establish one are fatal rather than counted.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ formal-pattern index: ${msg}`);
  process.exit(1);
};

// ── The fixture ──────────────────────────────────────────────────────────────
const PID = "schumer";
const probe = boot();
must(probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex,
  "PDXConsistency.formalPatternIndex is not exposed");
const stanceKeys = new Set(
  (probe._resolveStanceList(PID, probe.CMP_DATA[PID]) || [])
    .map((s) => s && s.issueKey).filter(Boolean));
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const SILENT = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && !/_balance$/.test(k));
const BALANCE = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && /_balance$/.test(k))[0];
// A stated position on an issue that HAS a for-or-against side — the row where the
// two facts sit beside each other. Balance keys are excluded because the pattern
// engine (correctly) refuses to read a direction on them.
const SPOKEN = ISSUE_KEYS.filter((k) =>
  stanceKeys.has(k) && !/_balance$/.test(k) && !(probe._PDX_RD_NO_POLE || {})[k])[0];
// A documented stance with NO formal record at all: it must NOT appear here.
const STANCE_ONLY = ISSUE_KEYS.filter((k) =>
  stanceKeys.has(k) && k !== SPOKEN && !/_balance$/.test(k))[0];
// STRONG   12 one way          → Strongly
// MOSTLY   10 votes, 8 one way → Mostly
// SPLIT     8 votes, 4 each    → Split
// THIN      one vote           → Thin (the one-vote lean)
// NONE      3 votes, 2-to-1    → No clear pattern yet
// SPOKEN   deep one-way run on an issue they have a STATED position on
const [STRONG, MOSTLY, SPLIT, THIN, NONE] = SILENT;
// …and then BREADTH, which is the whole point of this slice: a couple of dozen
// more issues the record touched, so the list under test is the long one a real
// officeholder produces rather than five hand-placed rungs.
const MORE_STRONG = SILENT.slice(5, 9);
const MORE_THIN = SILENT.slice(9, 25);
const MORE_NONE = SILENT.slice(25, 31);
must(STRONG && MOSTLY && SPLIT && THIN && NONE && BALANCE && SPOKEN && STANCE_ONLY &&
     MORE_STRONG.length === 4 && MORE_THIN.length === 16 && MORE_NONE.length === 6,
  "the fixture profile no longer offers every case");

const vote = (n, issueKey, position, opts) => {
  opts = opts || {};
  return {
    kind: "vote", rollcallId: 700 + n, measureId: 800 + n, number: "S. " + (100 + n),
    date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
    isProcedural: !!opts.proc, title: "Measure " + n,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
    issues: [{
      issueKey: issueKey, weight: 100,
      isPrimary: opts.primary !== false, supportMeaning: "yea_supports",
    }],
  };
};
const SEED = [];
for (let i = 0; i < 12; i++) SEED.push(vote(i, STRONG, "yea"));
for (let i = 0; i < 10; i++) SEED.push(vote(20 + i, MOSTLY, i < 8 ? "nay" : "yea"));
for (let i = 0; i < 8; i++) SEED.push(vote(35 + i, SPLIT, i % 2 ? "nay" : "yea"));
SEED.push(vote(50, THIN, "nay"));
SEED.push(vote(55, NONE, "nay"), vote(56, NONE, "nay"), vote(57, NONE, "yea"));
for (let i = 0; i < 4; i++) SEED.push(vote(60 + i, BALANCE, "nay"));
for (let i = 0; i < 7; i++) SEED.push(vote(70 + i, SPOKEN, "yea"));
let nn = 100;
MORE_STRONG.forEach((k) => { for (let i = 0; i < 12; i++) SEED.push(vote(nn++, k, "yea")); });
MORE_THIN.forEach((k, i) => SEED.push(vote(nn++, k, i % 2 ? "yea" : "nay")));
MORE_NONE.forEach((k) => {
  SEED.push(vote(nn++, k, "nay"), vote(nn++, k, "nay"), vote(nn++, k, "yea"));
});

// A: shipped. B: identical seeds, the record-direction derivation switched off —
// no index, no tier, no pattern chip anywhere. That is the product before slice 2,
// and it is the control Direction Match is compared against.
const A = boot(), B = boot();
A.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
B._recordDirectionIndex = undefined;
B.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
// COLD: the same profile with no vote pack — the surface as it shipped.
const COLD = boot();

const CS = A.PDXConsistency;
const FPI = CS.formalPatternIndex;
const ROWS = FPI.rows(PID);
const rowOf = (k) => ROWS.filter((x) => x.key === k)[0];
const INDEX = FPI.html(PID, { sort: "strength", view: "all" });
const BODY = A._pdxStanceRecordBody(PID, A.CMP_DATA[PID]);
const COLD_BODY = COLD._pdxStanceRecordBody(PID, COLD.CMP_DATA[PID]);
// One rendered row, by issue key.
const chunkOf = (html, k) => {
  for (const c of html.split(/<div class="pdxfpi-row["\s]/).slice(1)) {
    if ((c.match(/data-pdxfpi-issue="([^"]*)"/) || [])[1] === k) return c;
  }
  return "";
};
const countRows = (html) => (html.match(/class="pdxfpi-row/g) || []).length;
const countCards = (html) => (html.match(/class="fsrec-row(?=[" ])/g) || []).length;
must(ROWS.length > 20, `the seeded fixture produced only ${ROWS.length} index rows`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · it is the longer list");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cards = countCards(COLD_BODY);
  ok(cards > 0 && cards < 12,
    `the curated Full Stance Record is the small list it was (${cards} cards)`);
  eq(countRows(COLD_BODY), 0,
    "…and with no vote record on file the formal index does not render at all");
  ok(ROWS.length > cards * 3,
    `the formal index is multiples longer than the written cards (${ROWS.length} vs ${cards})`);
  eq(countRows(BODY), ROWS.length,
    "every index row the engine built is rendered in the overlay");
  ok(countCards(BODY) === cards,
    "…and the curated list is untouched beside it, not replaced");
  // The index is ABOVE the curated cards: it is the more complete answer to the
  // question the overlay's title asks.
  ok(BODY.indexOf('class="pdxfpi"') < BODY.indexOf('class="fsrec-curated-h"'),
    "the formal record leads, the documented cards follow");
  has(BODY, "Documented positions", "…under their own heading, so the two never read as one list");
  has(BODY, "issues on the formal record", "the stat row now counts the formal record too");
  // The promise on the way in matches the list that opens.
  has(A._pdxStanceRecordMiniLink(PID, A.CMP_DATA[PID]), "See all " + ROWS.length + " issues on the record",
    "the stance-navigation link names the longer list");
  has(A._pdxStanceRecordCta(PID, A.CMP_DATA[PID]), ROWS.length + " issues on the formal record",
    "…and so does the profile's Full Stance Record button");
  eq(A._pdxStanceRecordStats(PID, A.CMP_DATA[PID]).formal, ROWS.length,
    "…both reading the index's own count, so they cannot drift from it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · pattern-only rows are first-class");
// ═════════════════════════════════════════════════════════════════════════════
{
  const patternOnly = ROWS.filter((x) => !x.said);
  must(patternOnly.length > 5, "the fixture has no pattern-only population");
  ok(patternOnly.length > ROWS.filter((x) => x.said).length,
    `most of the formal record has no stated position beside it (${patternOnly.length} of ${ROWS.length})`);
  // In the DEFAULT view, not behind a filter.
  for (const x of patternOnly.slice(0, 6)) {
    ok(!!chunkOf(INDEX, x.key), `${x.key}: a pattern-only row renders in the default view`);
  }
  has(INDEX, "with no stated position from them yet",
    "the lede names the pattern-only population as a finding");
  // …and it has its own filter, which is not a "gaps" filter.
  const pat = FPI.html(PID, { sort: "strength", view: "pattern" });
  eq(countRows(pat), patternOnly.length, "the pattern-only filter shows exactly that population");
  has(pat, "Pattern only", "…and is labelled for what it is");
  lacks(INDEX, "Gaps only", "the index never files a record-with-no-card under gaps");
  lacks(INDEX, "No record yet", "…nor under an empty state it does not have");
  // Restore the shared view state for the assertions below.
  FPI.html(PID, { view: "all" });
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · stated + pattern rows show both, pattern first");
// ═════════════════════════════════════════════════════════════════════════════
{
  const x = rowOf(SPOKEN);
  must(!!x && x.said, "the fixture lost its stated-position-with-a-record row");
  eq(x.tier, "strong", "a deep one-way record on a stated issue reads as Strongly");
  const c = chunkOf(INDEX, SPOKEN);
  ok(!!c, "the row renders");
  has(c, "pdxst-pat", "…carrying the record's own pattern chip");
  has(c, "pdxor-stance", "…and their stated position beside it");
  ok(c.indexOf("pdxst-pat") < c.indexOf("pdxor-stance"),
    "…the record first, their word second — the one every row has leads");
  has(c, "not a stated position",
    "…with the disclosure that keeps the two apart travelling on the chip");
  // The two are independent: the stated position is read from the position map,
  // the pattern from the vote index, and neither is derived from the other.
  const stated = FPI.html(PID, { sort: "strength", view: "stated" });
  eq(countRows(stated), ROWS.filter((r) => r.said).length,
    "the with-stated-position filter shows exactly the rows that have one");
  for (const r of ROWS.filter((y) => y.said)) {
    has(chunkOf(stated, r.key), 'data-pdxfpi-said="1"',
      `${r.key}: the row states which population it is in`);
  }
  FPI.html(PID, { view: "all" });
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · thin stays thin");
// ═════════════════════════════════════════════════════════════════════════════
{
  const x = rowOf(THIN);
  must(!!x, "the fixture lost its one-vote row");
  eq(x.tier, "thin", "one vote is a thin lean");
  eq(x.patLabel, "Thin opposes", "…named as thin, and it still says which way");
  eq(x.counts, "1 vote against", "…with the count beside it");
  eq(x.weight, "thin", "…in the thin weight class");
  const c = chunkOf(INDEX, THIN);
  has(c, "w-thin", "the rendered chip carries the thin weight");
  lacks(c, "Strongly", "…never borrowing the deep tier's word");
  lacks(c, "Mostly", "…nor the dominant tier's");
  // Visibly weaker: the thin tier takes no fill, the deep tiers do.
  const strongChunk = chunkOf(INDEX, STRONG);
  has(strongChunk, "--bg:rgba(74,222,128,0.18)", "a deep pattern is filled with its own colour");
  has(c, "--bg:rgba(10,15,30,0.32)", "…and a thin one is not filled at all");
  // …and it sorts below every deep tier.
  const rank = {};
  ROWS.forEach((r, i) => { if (rank[r.tier] === undefined) rank[r.tier] = i; });
  for (const deep of ["strong", "mostly", "split"]) {
    if (rank[deep] === undefined) continue;
    ok(rank[deep] < rank.thin, `the first ${deep} row sits above the first thin row`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the sort");
// ═════════════════════════════════════════════════════════════════════════════
{
  const LADDER = ["strong", "mostly", "split", "thin", "none", "unread"];
  let last = -1, ordered = true;
  for (const r of ROWS) {
    const at = LADDER.indexOf(r.tier);
    ok(at >= 0, `${r.key}: "${r.tier}" is a published tier`);
    if (at < last) ordered = false;
    last = Math.max(last, at);
  }
  ok(ordered, "strongest first, thinnest last, unknown last of all");
  // Unknown never dominates the top.
  const firstQuarter = ROWS.slice(0, Math.max(3, Math.ceil(ROWS.length / 4)));
  ok(firstQuarter.every((r) => r.tier !== "none" && r.tier !== "unread"),
    "no unread or no-clear-pattern row reaches the top of the list");
  // Inside a tier, the deeper record leads.
  for (let i = 1; i < ROWS.length; i++) {
    if (ROWS[i - 1].tier !== ROWS[i].tier) continue;
    ok(ROWS[i - 1].judged >= ROWS[i].judged,
      `${ROWS[i].key}: inside one tier the deeper record is listed first`);
  }
  // A–Z is the reader's other question: "where is the issue I came for".
  const az = FPI.rows(PID, { sort: "az" });
  eq(az.length, ROWS.length, "A–Z lists the same issues");
  let alpha = true;
  for (let i = 1; i < az.length; i++) if (az[i - 1].label > az[i].label) alpha = false;
  ok(alpha, "…in label order");
  // The host's Sort control drives it, so one control governs both lists.
  has(FPI.html(PID, { sort: "az" }), 'data-pdxfpi-sort="az"',
    "the rendered index records which sort it was built with");
  FPI.html(PID, { view: "all" });
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the filters");
// ═════════════════════════════════════════════════════════════════════════════
{
  const seen = new Set();
  for (const v of ["all", "stated", "pattern", "supports", "opposes", "split"]) {
    const h = FPI.html(PID, { sort: "strength", view: v });
    const n = countRows(h);
    has(h, `data-pdxfpi-view="${v}"`, `the ${v} view records itself on the host`);
    has(h, `Showing <b>${n}</b> of ${ROWS.length}`,
      `the ${v} view says how much of the list it is showing`);
    if (v === "all") {
      eq(n, ROWS.length, "the default view hides nothing");
      ROWS.forEach((r) => seen.add(r.key));
    } else {
      ok(n > 0 && n <= ROWS.length, `the ${v} view shows a real subset (${n})`);
    }
  }
  eq(seen.size, ROWS.length, "every row in the index is reachable from the default view");
  const sup = FPI.html(PID, { view: "supports" });
  const opp = FPI.html(PID, { view: "opposes" });
  eq(countRows(sup), ROWS.filter((r) => r.tone === "support").length,
    "supports-leaning is exactly the support-toned rows");
  eq(countRows(opp), ROWS.filter((r) => r.tone === "oppose").length,
    "opposes-leaning is exactly the oppose-toned rows");
  eq(countRows(FPI.html(PID, { view: "split" })), ROWS.filter((r) => r.tier === "split").length,
    "split is exactly the split rows");
  ok(countRows(sup) + countRows(opp) < ROWS.length,
    "…and neither direction filter is the whole list");
  // A filter that would change nothing is not offered.
  const offered = (FPI.html(PID, { view: "all" }).match(/data-pdxfpi-set="([a-z]+)"/g) || [])
    .map((s) => s.replace(/.*="([a-z]+)".*/, "$1"));
  has(offered.join(","), "all", "the way back to the whole list is always offered");
  const thinOnly = boot();
  thinOnly.PDXVotingRecord.noteMember(PID, [vote(1, THIN, "nay")].map((v) => JSON.parse(JSON.stringify(v))));
  const tHtml = thinOnly.PDXConsistency.formalPatternIndex.html(PID, { view: "all" });
  const tOffered = (tHtml.match(/data-pdxfpi-set="([a-z]+)"/g) || []).length;
  ok(tOffered <= 1, `a one-population index offers no dead filters (${tOffered})`);
  FPI.html(PID, { view: "all" });
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · every row is a door into the dossier");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ids = new Set();
  for (const x of ROWS) {
    const c = chunkOf(INDEX, x.key);
    ok(!!c, `${x.key}: renders`);
    if (!c) continue;
    // The SAME delegated attribute the stance rows use — one handler, one dossier.
    has(c, `data-pdxst-dos="${x.key}"`, `${x.key}: the issue name is the dossier door`);
    has(c, `data-pdxst-pid="${PID}"`, `${x.key}: …for this politician`);
    const id = (c.match(/id="(pdxfpi-row-[^"]*)"/) || [])[1];
    ok(!!id, `${x.key}: the row has an id to come back to`);
    has(c, `data-pdxst-origin="${id}"`, `${x.key}: …and the door carries it, so closing returns here`);
    ok(!ids.has(id), `${x.key}: the row id is unique in the document`);
    ids.add(id);
    // NOT the stance row's id: that row may be on the page at the same time and
    // two elements cannot share one id.
    ok(id.indexOf("pdxfpi-row-") === 0, `${x.key}: the index owns its own row ids`);
    has(c, "Open the issue dossier", `${x.key}: …announced the way every other door is`);
  }
  // The overlay carries the doors too, and the shipped delegated handler is armed.
  has(BODY, "data-pdxst-dos=", "the doors are live inside the Full Stance Record overlay");
  has(R("consistency.js"), "closest('[data-pdxst-dos]')",
    "…handled by the one shipped [data-pdxst-dos] listener, not a second one");
  // And the dossier those doors open actually assembles for an index row.
  const sheet = CS.gapViewHtml ? CS.gapViewHtml(PID, THIN) : "";
  if (CS.gapViewHtml) ok(!!sheet, "the dossier assembles for a thin pattern-only row");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · it fails closed");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A documented stance with no formal record is not a formal-record row.
  ok(!rowOf(STANCE_ONLY),
    "an issue with a stated position and nothing formal on file stays off this list");
  const formalKeys = new Set(ROWS.map((x) => x.key));
  for (const r of CS.issueRows(PID)) {
    if (formalKeys.has(r.key)) continue;
    const res = CS.rowResult(r);
    eq(res.held || 0, 0, `${r.key}: every excluded row is excluded for holding nothing formal`);
    eq(CS.recordPattern.tier(r), null, `${r.key}: …and for having no pattern either`);
  }
  // An issue with no for-or-against side gets no direction — from a record that
  // may be perfectly one-sided. The shortfall is ours and the row says so.
  const bal = rowOf(BALANCE);
  must(!!bal, "the balance-key row is missing from the fixture");
  eq(bal.tier, "unread", "a key with no support pole reads as unread, not as a tier");
  eq(bal.directional, false, "…claims no direction");
  eq(bal.patLabel, "No side to read on this issue", "…and says why in its own words");
  const bc = chunkOf(INDEX, BALANCE);
  lacks(bc, "supports", "…never wording it as support");
  lacks(bc, "opposes", "…nor as opposition");
  has(bc, "gap in our mapping", "…and names the gap as ours, not theirs");
  ok(ROWS.indexOf(bal) > ROWS.length - 1 - ROWS.filter((x) => x.tier === "unread").length,
    "…and it sorts to the bottom, below the rows that do say something");
  // The exec lane is listed, with its own sentence and no borrowed verb.
  const EX = boot();
  const exRows = EX.PDXConsistency.formalPatternIndex.rows("trump");
  must(exRows.length > 5, "the executive fixture no longer has a record");
  ok(exRows.every((x) => x.tier === "unread"),
    `every exec row is honest about having no pattern read (${exRows.length} rows)`);
  const exHtml = EX.PDXConsistency.formalPatternIndex.html("trump", { view: "all" });
  has(exHtml, "Pattern not read on this lane yet", "…in the lane's own words");
  has(exHtml, "has not been extended to executive actions yet", "…saying exactly why");
  has(exHtml, "actions on file", "…while still naming the instruments it holds");
  lacks(exHtml, "No clear pattern yet",
    "…and never borrowing the tier that means we DID read the record");
  // No formal record at all: no index, rather than an empty one promising rows.
  eq(COLD.PDXConsistency.formalPatternIndex.html(PID, { view: "all" }), "",
    "a profile with nothing formal on file renders no index at all");
  eq(FPI.count("nobody-at-all"), 0, "an unknown politician counts zero, it does not throw");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · it is not a score, and not a stance");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE WALL. Direction Match is byte-identical with the derivation switched off.
  const byB = {};
  B.PDXConsistency.issueRows(PID).forEach((r) => { byB[r.key] = r; });
  let differing = 0;
  for (const r of CS.issueRows(PID)) {
    const b = byB[r.key];
    ok(!!b, `${r.key}: the row exists in both sandboxes`);
    if (!b) continue;
    const ra = CS.rowResult(r), rb = B.PDXConsistency.rowResult(b);
    if (ra.pct !== rb.pct || ra.state !== rb.state ||
        r.verdict.token !== b.verdict.token || r.tier !== b.tier) differing++;
  }
  eq(differing, 0, "not one row's Direction Match, state, verdict or tier moves");
  eq(JSON.stringify(CS.verdictTally(PID)), JSON.stringify(B.PDXConsistency.verdictTally(PID)),
    "the verdict tally is byte-identical");
  // No percentage anywhere in the index. The one formal percentage on this site is
  // Direction Match, and a second number here would read as a second score.
  eq(INDEX.indexOf("%"), -1, "the index prints no percentage");
  eq(INDEX.indexOf("Direction match"), -1, "…and never borrows Direction Match's name");
  has(INDEX, "none of it enters Direction Match", "…while stating the wall it sits behind");
  // Rendering the index does not write a stance anywhere.
  const before = JSON.stringify(A._polPositionMap ? A._polPositionMap(PID, A.CMP_DATA[PID]) : {});
  FPI.rows(PID); FPI.html(PID, { view: "all" }); A._pdxStanceRecordBody(PID, A.CMP_DATA[PID]);
  const after = JSON.stringify(A._polPositionMap ? A._polPositionMap(PID, A.CMP_DATA[PID]) : {});
  eq(after, before, "the position map is untouched by building or rendering the index");
  // A ROW WITH NOTHING STATED ON IT STILL MAY NOT CLAIM A QUOTE. What it may do —
  // since the baseline pass — is print the record's OWN direction in the slot the
  // stated chip would have used, under its own label and behind its own denial.
  // The line that must not be crossed is the wording, not the pixel: `stance` stays
  // empty, "Says:" is never printed, and anything in that slot is marked baseline.
  const CSB = CS.baseline || null;
  for (const x of ROWS) {
    if (x.said) continue;
    eq(x.stance, "", `${x.key}: a pattern read never becomes a stated position`);
    const chunk = chunkOf(INDEX, x.key);
    lacks(chunk, "Says:", `${x.key}: …and no "Says:" chip is invented for it`);
    const bl = CSB ? CSB.for(PID, x.key) : null;
    if (chunk.indexOf("pdxor-stance") >= 0) {
      ok(!!bl, `${x.key}: a chip in the stated slot is there because the record read a side`);
      has(chunk, "pdxor-baseline", `${x.key}: …and is marked as the baseline it is`);
      has(chunk, "Baseline:", `${x.key}: …under the Baseline label`);
      has(chunk, "Not in Direction Match", `${x.key}: …disowning the score on its face`);
    } else {
      eq(bl, null, `${x.key}: …and the slot is empty exactly when the record read no side`);
    }
  }
  // Nothing in the row model changed either: the index is a reader of it.
  const shape = CS.issueRows(PID).map((r) => `${r.key}:${r.tier}:${r.verdict.token}`).join("|");
  FPI.rows(PID, { sort: "az" });
  eq(CS.issueRows(PID).map((r) => `${r.key}:${r.tier}:${r.verdict.token}`).join("|"), shape,
    "…and reading it twice, in two orders, changes none of it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · formal lane only, and no party framing");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(INDEX, "formal record only", "the index states which lane it is");
  // The public lane is absent from this surface entirely — no tag of its own, no
  // evidence tag, no items. Checked on the classes rather than on the sentence,
  // because the record-derived baseline denies Direction Match in the same words
  // and it is a formal-lane thing saying a formal-lane thing.
  lacks(INDEX, "pdxst-pub-tag",
    "…and carries no public-lane tag, because it holds no public-lane items");
  lacks(INDEX, "pdxst-ev-tag", "…nor a public-lane evidence tag");
  for (const bad of ["Democrat", "Republican", "GOP", "party line", "party-line", "their party"]) {
    lacks(INDEX, bad, `no party framing: "${bad}"`);
  }
  // A public receipt cannot put an issue on this list or move a chip on it. The
  // index is built from the same seeds either way, with the public lane untouched.
  const P = boot();
  P.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
  const beforeKeys = P.PDXConsistency.formalPatternIndex.rows(PID)
    .map((x) => `${x.key}:${x.tier}:${x.counts}`).join("|");
  eq(beforeKeys, ROWS.map((x) => `${x.key}:${x.tier}:${x.counts}`).join("|"),
    "two identically-seeded sandboxes build the identical index");
  // Public receipts exist on this profile and are counted elsewhere; they are not
  // counted here, which is what the row's own inventory line proves.
  for (const x of ROWS) {
    const r = x.row;
    if (!r || !r.public) continue;
    eq(x.held, (r.evidence && r.evidence.actions) || 0,
      `${x.key}: the row's count is its formal inventory, never the public one`);
  }
}

if (failures.length) {
  console.error(`\n✗ formal-pattern index: ${failures.length} of ${passed + failures.length} assertions failed`);
  failures.slice(0, 30).forEach((f) => console.error("   · " + f));
  process.exit(1);
}
const census = {};
ROWS.forEach((x) => { census[x.tier] = (census[x.tier] || 0) + 1; });
console.log(`\n✓ formal-pattern index: all ${passed} assertions passed — ` +
  `${countCards(COLD_BODY)} written cards → ${ROWS.length} issues on the formal record ` +
  `(${JSON.stringify(census)}), every one a door into the dossier, ` +
  `Direction Match byte-identical either way`);
