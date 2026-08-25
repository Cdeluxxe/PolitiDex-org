#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-fpi-hierarchy.mjs — the formal index, ordered and folded, and the six
// different sentences it says when it will not name a direction
// ─────────────────────────────────────────────────────────────────────────────
// The formal pattern index earned its length honestly: one row per issue the
// record actually touched, far past the written cards. Length is not the problem.
// FLATNESS was. Fifty-eight rows arriving at one visual weight makes the fourteen
// rows that say something and the thirty-eight that say "not enough on file"
// indistinguishable on first paint, and a reader who has to sort that themselves
// reads a strong record as a noisy one.
//
// So the same rows, in the same order, are now FILED — and this harness is the
// fence around that, because filing is exactly the kind of change that can quietly
// become hiding:
//
//   1. THE BANDS CUT ON THE RANK THE SORT ALREADY ASSIGNED. No new tier, no new
//      strength word, no row promoted or demoted by being filed.
//   2. THE TAIL IS CLOSED, NOT ABSENT. Every row is in the document either way —
//      so deep links, find-in-page, the back pill and every filter count still
//      see the whole list.
//   3. FOLDING IS EARNED. No lead band, or a tail too short to be worth a tap,
//      and nothing folds. A thin profile must not be inflated; it must also not
//      be blanked.
//   4. THE CENSUS SURVIVED THE MOVE. Every label the old single strip showed
//      still appears, under the band that owns its rows.
//   5. SIX REFUSALS, SIX SENTENCES. "No clear pattern yet" was one sentence over
//      several different facts. Each now says which fact it is — including the
//      two new ones: a record carried only inside larger packages, and a record
//      that has not finished loading.
//   6. NONE OF IT IS A CLAIM. No percentage, no party, no direction word in a
//      refusal, and Direction Match byte-identical with the whole thing running.
//
//   node scripts/test-fpi-hierarchy.mjs
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
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
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
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ fpi-hierarchy: ${msg}`);
  process.exit(1);
};

// ── Fixtures ─────────────────────────────────────────────────────────────────
const PID = "schumer";
const probe = boot();
must(probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex,
  "PDXConsistency.formalPatternIndex is not exposed");
const NARROW = probe._PDX_RD_NARROW_AT;
must(typeof NARROW === "number", "the narrow-mapping cap is no longer published");

const stanceKeys = new Set(
  (probe._resolveStanceList(PID, probe.CMP_DATA[PID]) || [])
    .map((s) => s && s.issueKey).filter(Boolean));
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const SILENT = ISSUE_KEYS.filter((k) =>
  !stanceKeys.has(k) && !/_balance$/.test(k) && !(probe._PDX_RD_NO_POLE || {})[k]);
const BALANCE = ISSUE_KEYS.filter((k) => /_balance$/.test(k))[0];
must(SILENT.length > 30 && BALANCE, "the fixture profile no longer offers enough issues");

// One-issue roll-call vote: the ordinary case.
const vote = (n, issueKey, position, opts) => {
  opts = opts || {};
  return {
    kind: "vote", rollcallId: 700 + n, measureId: 800 + n, number: "S. " + (100 + n),
    date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
    isProcedural: !!opts.proc, title: "Measure " + n,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
    issues: [{ issueKey: issueKey, weight: 100, isPrimary: opts.primary !== false,
      supportMeaning: "yea_supports" }],
  };
};
// A PROVISION: two issues, secondary mapping, narrow weight — the three conditions
// _recordVehicleStats requires before it will call an instrument a package.
const rider = (n, issueKey, carrier, bill, position) => ({
  kind: "vote", rollcallId: 900 + n, measureId: 1000 + n, number: bill,
  date: "2025-03-" + (10 + (n % 9)), action: "On Passage", position: position || "yea",
  isProcedural: false, title: "Consolidated Appropriations Act — " + bill,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (900 + n), label: "Congress.gov" },
  issues: [
    { issueKey: carrier, weight: 90, isPrimary: true, supportMeaning: "yea_supports" },
    { issueKey: issueKey, weight: Math.min(10, NARROW), isPrimary: false,
      supportMeaning: "yea_supports" },
  ],
});

// The DEEP fixture: enough clear, split, thin and unreadable material to produce
// every band at once and a tail long enough to earn its fold.
const CLEAR = SILENT.slice(0, 6);          // 12 one way each  → strong
const SPLITS = SILENT.slice(6, 9);         // 8 votes, 4 each  → split
const THINS = SILENT.slice(9, 25);         // one vote each    → thin
const NOSIDE = SILENT.slice(25, 29);       // all Present      → no_side_taken
const PKG = SILENT[29];                    // provisions only  → vehicle_only
const CARRIER = SILENT[30];
must(CLEAR.length === 6 && SPLITS.length === 3 && THINS.length === 16 &&
     NOSIDE.length === 4 && PKG && CARRIER, "the fixture no longer offers every band");

const SEED = [];
let nn = 0;
CLEAR.forEach((k) => { for (let i = 0; i < 12; i++) SEED.push(vote(nn++, k, "yea")); });
SPLITS.forEach((k) => { for (let i = 0; i < 8; i++) SEED.push(vote(nn++, k, i % 2 ? "nay" : "yea")); });
THINS.forEach((k, i) => SEED.push(vote(nn++, k, i % 2 ? "yea" : "nay")));
NOSIDE.forEach((k) => { for (let i = 0; i < 3; i++) SEED.push(vote(nn++, k, "present")); });
for (let i = 0; i < 4; i++) SEED.push(vote(nn++, BALANCE, "yea"));
// Eight provisions on PKG, all riding CARRIER, all one way: deep enough and
// one-sided enough that only the primary wall stops it — which is exactly the
// population the package sentence is for.
for (let i = 1; i <= 8; i++) SEED.push(rider(i, PKG, CARRIER, "H.R. " + (7000 + i), "yea"));

const A = boot();
A.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
const FPI = A.PDXConsistency.formalPatternIndex;
const ROWS = FPI.rows(PID);
const HTML = FPI.html(PID, { sort: "strength", mount: "deep", view: "all" });

const countRows = (html) => (html.match(/class="pdxfpi-row/g) || []).length;
const bandsIn = (html) =>
  (html.match(/data-pdxfpi-band="([^"]*)"/g) || []).map((m) => m.slice(18, -1));
const bandBlock = (html, id) => {
  const at = html.indexOf(`data-pdxfpi-band="${id}"`);
  if (at < 0) return "";
  const rest = html.slice(at);
  const next = rest.slice(1).search(/data-pdxfpi-band="|<\/details>/);
  return next < 0 ? rest : rest.slice(0, next + 1);
};
const tailAt = HTML.indexOf('<details class="pdxfpi-tail"');
must(ROWS.length > 25, `the seeded fixture produced only ${ROWS.length} index rows`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the bands cut on the rank the sort already assigned");
// ═════════════════════════════════════════════════════════════════════════════
{
  const order = bandsIn(HTML);
  ok(order.length >= 3, `the list is filed into bands (${order.join(", ")})`);
  eq(order.join(">"), "clear>split>thin>rest",
    "the bands appear strongest-first, in the order the rank already implied");
  has(HTML, "Clearest patterns", "the lead band says what it is");
  has(HTML, "Ran both ways", "a split band is a finding, and is named as one");
  has(bandBlock(HTML, "split"),
    "That is a finding about the record, not a gap in it",
    "…and says so, so a split is not read as a shortfall");
  has(HTML, "A direction, but too little to lean on",
    "thin material keeps its own honest heading");
  has(HTML, "On file, nothing readable yet",
    "and unreadable material keeps its own, separate from thin");

  // The band a row lands in must be the band its own rank implies — no reshuffle.
  const RANK = { strong: 0, mostly: 1, split: 2, thin: 3, none: 4, unread: 5 };
  const WANT = (r) => (r <= 1 ? "clear" : r === 2 ? "split" : r === 3 ? "thin" : "rest");
  let misfiled = 0;
  ROWS.forEach((x) => {
    const want = WANT(typeof x.rank === "number" ? x.rank : RANK[x.tier]);
    const block = bandBlock(HTML, want);
    if (block.indexOf(`data-pdxfpi-issue="${x.key}"`) < 0) misfiled++;
  });
  eq(misfiled, 0, "every row is filed under the band its own rank implies");

  // Filing is not scoring: the tier attribute on each row is untouched.
  const tiers = new Set((HTML.match(/data-pdxfpi-tier="([^"]*)"/g) || []));
  ok(tiers.size >= 3, `rows still carry their own tier attribute (${tiers.size} distinct)`);
  lacks(HTML, "data-pdxfpi-tier=\"clear\"", "no band id ever leaked into a row's tier");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the tail is closed, not absent");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(tailAt > 0, "a deep record folds its long tail behind one control");
  eq(countRows(HTML), ROWS.length,
    "every row the engine built is still in the document, folded or not");
  const head = HTML.slice(0, tailAt);
  ok(countRows(head) > 0, "the strongest patterns are above the fold");
  ok(countRows(head) < ROWS.length / 2,
    `the first screen is the readable minority, not the whole list ` +
    `(${countRows(head)} of ${ROWS.length})`);

  const declared = Number((HTML.match(/data-pdxfpi-tail="(\d+)"/) || [])[1]);
  eq(countRows(HTML.slice(tailAt)), declared,
    "the fold's own count is the number of rows actually inside it");
  eq(countRows(head) + declared, ROWS.length,
    "…and nothing is dropped between the two halves");

  // The summary line names the bands inside rather than flattening them.
  const summary = HTML.slice(tailAt, HTML.indexOf("</summary>", tailAt));
  has(summary, "more issue", "the fold says how much it is holding");
  has(summary, "too little to lean on",
    "…and that some of it carries a direction that is merely thin");
  has(summary, "nothing readable yet",
    "…and that the rest carries no direction at all — two different facts");
  lacks(summary, "no pattern to read",
    "the fold never describes thin directional rows as having nothing to read");

  // Every folded row keeps the identity the rest of the app navigates by.
  const inside = HTML.slice(tailAt);
  const folded = inside.split(/<div class="pdxfpi-row["\s]/).slice(1);
  eq(folded.filter((c) => c.indexOf('data-pdxst-dos="') >= 0).length, declared,
    "every folded row keeps its dossier door");
  ok((inside.match(/id="pdxfpi-row-/g) || []).length === declared,
    "…and its own id, so a deep link still lands on it");
  has(R("profiles-full.js"), "node.open = true",
    "the deep-link walker still opens a closed <details> before it scrolls");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · folding is earned, never assumed");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A record with a couple of clear patterns and a two-row tail: folding two rows
  // behind a control costs a tap and saves nothing, so it does not happen.
  const S = boot();
  const small = [];
  let m = 0;
  CLEAR.slice(0, 2).forEach((k) => { for (let i = 0; i < 12; i++) small.push(vote(m++, k, "yea")); });
  THINS.slice(0, 2).forEach((k) => small.push(vote(m++, k, "yea")));
  S.PDXVotingRecord.noteMember(PID, small);
  const H = S.PDXConsistency.formalPatternIndex.html(PID, { sort: "strength", mount: "small" });
  const N = S.PDXConsistency.formalPatternIndex.rows(PID).length;
  ok(N > 0 && N < 8, `the short fixture is short (${N} rows)`);
  lacks(H, '<details class="pdxfpi-tail"',
    "a tail too short to be worth a tap is left open");
  eq(countRows(H), N, "…and every row is still rendered");

  // A record with NOTHING readable: the tail IS the record, and blanking it would
  // be the same lie in the other direction.
  const T = boot();
  const thinOnly = [];
  let t = 0;
  THINS.forEach((k, i) => thinOnly.push(vote(t++, k, i % 2 ? "yea" : "nay")));
  T.PDXVotingRecord.noteMember(PID, thinOnly);
  const TH = T.PDXConsistency.formalPatternIndex.html(PID, { sort: "strength", mount: "thin" });
  const TN = T.PDXConsistency.formalPatternIndex.rows(PID).length;
  ok(TN >= 8, `the thin fixture has a long tail and no lead (${TN} rows)`);
  lacks(TH, '<details class="pdxfpi-tail"',
    "with no clearer band above it, thin material is not folded away");
  eq(countRows(TH), TN, "…and all of it renders open");
  has(TH, "A direction, but too little to lean on",
    "…still under its own honest heading rather than promoted");
  lacks(TH, "Clearest patterns", "…and no band it did not earn");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the census survived the move");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok((HTML.match(/class="pdxfpi-census"/g) || []).length >= 2,
    "the census strip is per-band now, not one strip over everything");
  const clear = bandBlock(HTML, "clear");
  has(clear, 'class="pdxfpi-census"', "the lead band carries its own census");
  const labels = new Set(ROWS.map((x) => x.patLabel));
  let shown = 0;
  labels.forEach((lb) => { if (HTML.indexOf(">" + lb + "</span>") >= 0) shown++; });
  ok(shown >= labels.size - 3,
    `nearly every distinct pattern label still appears (${shown} of ${labels.size})`);
  // The fold's own strip is capped, and says so rather than truncating silently.
  const summary = HTML.slice(tailAt, HTML.indexOf("</summary>", tailAt));
  const pills = (summary.match(/class="pdxfpi-cn[" ]/g) || []).length;
  ok(pills > 0 && pills <= 4, `the fold's census is capped (${pills} pills)`);
  has(summary, "more</span>", "…and names the overflow instead of hiding it");

  // Band headers count what they hold.
  ["clear", "split", "thin", "rest"].forEach((id) => {
    const block = bandBlock(HTML, id);
    if (!block) return;
    const n = Number((block.match(/class="pdxfpi-bh-n">(\d+)</) || [])[1]);
    eq(n, countRows(block), `the ${id} band's header count is its own row count`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · six refusals, six sentences");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) MATERIAL EXISTS ONLY AS PACKAGE-BORNE PROVISIONS.
  const pkg = ROWS.filter((x) => x.key === PKG)[0];
  must(pkg, "the package fixture produced no row at all");
  const veh = A._pdxRecordVehicleStats(PID, PKG);
  eq(veh.only, true, "the stowaway detector says every instrument here was a provision");
  eq(pkg.why && pkg.why.id, "vehicle_only",
    "…and the row says so, rather than calling the record incidental");
  eq(pkg.why.lb, "Only carried inside larger packages", "the package refusal has its own words");
  has(pkg.why.note, "a package is not a position on everything inside it",
    "…and explains why no direction follows from one");
  ok(!pkg.tier || pkg.tier === "unread", `the package row claims no tier (${pkg.tier})`);
  eq(pkg.vehicle, null,
    "the directional 🚂 disclosure stays off a row that claims no direction");
  ["supports", "opposes", "advanc", "leans"].forEach((w) => {
    lacks(pkg.why.lb + " " + pkg.why.note, w,
      `the package refusal borrows no direction word ("${w}")`);
  });

  // (b) MATERIAL EXISTS BUT NOBODY TOOK A SIDE.
  const none = ROWS.filter((x) => x.key === NOSIDE[0])[0];
  if (none && none.why) {
    eq(none.why.id, "no_side_taken", "an all-Present ledger says nobody took a side");
    has(none.why.note, "Present", "…and names the positions that produced it");
  } else ok(false, "the all-Present fixture produced no refusal to inspect");

  // (c) THE ISSUE ITSELF HAS NO SIDE.
  const bal = ROWS.filter((x) => x.key === BALANCE)[0];
  if (bal && bal.why) {
    eq(bal.why.id, "no_side", "a balance key says the gap is in OUR mapping");
    has(bal.why.note, "not a finding about", "…explicitly, so it is not read as their shortfall");
  } else ok(true, "no balance row on file to inspect (the engine failed closed)");

  // (d) THE RECORD HAS NOT FINISHED LOADING — a claim about this page, not them.
  const COLD = boot();
  const coldRows = COLD.PDXConsistency.formalPatternIndex.rows(PID) || [];
  const pending = coldRows.filter((x) => x.why && x.why.id === "pending");
  ok(!COLD.PDXConsistency.recordSettled(PID),
    "with no fetch returned, the record is not settled");
  if (coldRows.length) {
    ok(pending.length > 0,
      `a row rendered before the votes land says it is still loading (${pending.length})`);
    if (pending.length) {
      has(pending[0].why.note, "statement about this page",
        "…and says the wait is ours, not a finding about their record");
      lacks(pending[0].why.lb + pending[0].why.note, "No roll-call pattern on file",
        "…rather than reporting our latency as their silence");
    }
  } else ok(true, "this fixture has no cold formal rows to inspect");

  // (e) EVERY REFUSAL IS DISTINCT, AND NAMED IN THE MARKUP.
  const ids = new Set(ROWS.filter((x) => x.why).map((x) => x.why.id));
  ok(ids.size >= 2, `the fixture exercises several distinct refusals (${[...ids].join(", ")})`);
  ids.forEach((id) => has(HTML, `data-pdxfpi-pat="${id}"`,
    `the ${id} refusal is named in the markup, not just in prose`));
  const notes = ROWS.filter((x) => x.why).map((x) => x.why.note);
  eq(new Set(notes).size, ids.size,
    "one sentence per refusal id — no two different facts share a sentence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · truly nothing on file is its own answer, and it is not on this list");
// ═════════════════════════════════════════════════════════════════════════════
{
  const TRACKED = A.PDXConsistency.issueRows(PID) || [];
  const tracked = TRACKED.length;
  ok(tracked >= ROWS.length, `the tracked list is at least the formal list (${tracked} vs ${ROWS.length})`);
  if (tracked > ROWS.length) {
    has(HTML, "nothing formal on file at all",
      "the lede counts the issues with no formal material rather than listing them");
    has(HTML, "not on this list",
      "…and says plainly that they are absent by design");
  } else ok(true, "this fixture tracks nothing beyond the formal list");
  // Absence is counted, never rendered as a row.
  const keys = new Set(ROWS.map((x) => x.key));
  let ghosts = 0;
  TRACKED.forEach((r) => {
    if (!keys.has(r.key) && HTML.indexOf(`data-pdxfpi-issue="${r.key}"`) >= 0) ghosts++;
  });
  eq(ghosts, 0, "no issue without formal material is rendered as a formal row");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · none of it is a claim");
// ═════════════════════════════════════════════════════════════════════════════
{
  const bandCopy = (HTML.match(/class="pdxfpi-b[hn]"[^>]*>[\s\S]*?<\/p>/g) || []).join(" ");
  lacks(bandCopy, "%", "no band heading or note carries a percentage");
  ["Republican", "Democrat", "GOP", "party line", "his party", "their party"].forEach((w) =>
    lacks(HTML, w, `the filed index never mentions party ("${w}")`));
  eq((HTML.match(/\d+%/g) || []).length, 0, "no percentage anywhere in the filed index");

  // The filing is presentational: the same rows, the same reads, either view.
  const az = FPI.html(PID, { sort: "az", mount: "deep2", view: "all" });
  eq(countRows(az), ROWS.length, "the A–Z view renders the same number of rows");
  // Filters still count against the whole list, not the unfolded part.
  ["stated", "pattern", "supports", "opposes", "split"].forEach((v) => {
    const h = FPI.html(PID, { sort: "strength", mount: "v-" + v, view: v });
    const want = ROWS.filter((x) => {
      if (v === "stated") return x.said;
      if (v === "pattern") return !x.said;
      if (v === "supports") return x.tone === "support";
      if (v === "opposes") return x.tone === "oppose";
      return x.tier === "split";
    }).length;
    eq(countRows(h), want, `the ${v} filter still renders every matching row`);
  });
}

// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ fpi-hierarchy: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ fpi-hierarchy: all ${passed} assertions passed`);
console.log(`   ${ROWS.length} rows filed into ${bandsIn(HTML).join(" / ")}` +
  (tailAt > 0 ? `, ${(HTML.match(/data-pdxfpi-tail="(\d+)"/) || [])[1]} folded` : ", nothing folded"));
