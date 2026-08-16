#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-record-direction.mjs — what the record DID, on a row nobody stated
// ─────────────────────────────────────────────────────────────────────────────
// Slice 1 of the Vote Pattern Index. The record touches ~8,700 (member, issue)
// pairs and we hold a stated position on ~900 of them; the other ~7,800 rows
// printed an inventory ("14 votes on file") and nothing about what those votes
// did. This adds a record SUMMARY to those rows — counts and a plain clause in
// the product's existing effect vocabulary — and nothing else. It is not a
// stance, not a score, and not a second number for Direction Match to be
// confused with.
//
// The walls this pins, in the order a reader would doubt them:
//
//   1. DIRECTION MATCH IS BYTE-IDENTICAL. Two sandboxes, the same seeds, the
//      index live in one and switched off in the other: every percentage,
//      score, state, bucket and tally matches exactly — while the rendered
//      HTML differs, so the comparison is not vacuous.
//   2. NO PERCENTAGE, EVER. Not in the clause, not in the summary, not in the
//      strings the index puts on the page.
//   3. THE TOKENS ARE ITS OWN. `record_*` shares no key with the legislative
//      VERDICTS or the executive ones — the lanes stay distinguishable in the
//      one place they must not blend.
//   4. IT NEVER AUTHORS A STANCE. A row with a stated position never gets a
//      record-direction line, and the index takes no stance argument to write
//      one from.
//   5. THE THRESHOLDS HOLD. n≥4 with ≥75% of the weight one way to be
//      characterised; 2–3 one-way votes stated as the bare fact; everything
//      else stays thin. Balance keys and subject-named keys are suppressed,
//      and a member we barely hold a record for gets no "pattern" at all.
//   6. THE COUNT IS STILL THE DOOR, and the arithmetic on the face adds up.
//
//   node scripts/test-record-direction.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded
// the way a completed /api/voting-record fetch leaves the cache. No database,
// no network, no browser.

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
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`  · ${t}`);

const PID = "massie";

// ── The fixture ──────────────────────────────────────────────────────────────
// Keys are chosen off the real row model rather than asserted, so a data change
// that removes an issue fails loudly here instead of silently vacating a case.
const probe = boot();
const stanceKeys = new Set(
  probe.PDXConsistency.issueRows(PID).filter((r) => r.said).map((r) => r.key)
);
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const SILENT = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && !/_balance$/.test(k));
const BALANCE = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && /_balance$/.test(k))[0];
const SPOKEN = ISSUE_KEYS.filter((k) => stanceKeys.has(k))[0];
// DEEP: 14 mapped votes, 11 one way — the shape the index exists for.
// UNIFORM: two votes, both the same way — stated as the bare fact, no tendency.
// MIXED3: three votes, two-to-one — under the floor, stays thin.
// SOLO: one vote — thin, and always was.
// SPLIT: six votes, three each — deep enough to characterise, and it will not.
const [DEEP, UNIFORM, MIXED3, SOLO, SPLIT] = SILENT;
if (!DEEP || !UNIFORM || !MIXED3 || !SOLO || !SPLIT || !BALANCE || !SPOKEN) {
  console.error("✗ record direction: the fixture profile no longer offers every case");
  process.exit(1);
}

const vote = (n, issueKey, position, opts) => {
  opts = opts || {};
  return {
    kind: "vote", rollcallId: 500 + n, measureId: 900 + n, number: "H.R. " + (100 + n),
    date: "2025-0" + ((n % 9) + 1) + "-14", action: "On Passage", position: position,
    isProcedural: !!opts.proc, title: "Measure " + n,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (500 + n), label: "Congress.gov" },
    issues: [{
      issueKey: issueKey, weight: 100,
      isPrimary: opts.primary !== false, supportMeaning: "yea_supports",
    }],
  };
};
const SEED = [];
for (let i = 0; i < 14; i++) SEED.push(vote(i, DEEP, i < 11 ? "nay" : "yea"));
SEED.push(vote(20, UNIFORM, "nay"), vote(21, UNIFORM, "nay"));
SEED.push(vote(30, MIXED3, "nay"), vote(31, MIXED3, "nay"), vote(32, MIXED3, "yea"));
SEED.push(vote(40, SOLO, "nay"));
for (let i = 0; i < 6; i++) SEED.push(vote(50 + i, SPLIT, i % 2 ? "nay" : "yea"));
SEED.push(vote(70, BALANCE, "nay"), vote(71, BALANCE, "nay"),
          vote(72, BALANCE, "nay"), vote(73, BALANCE, "nay"));
// A stated position WITH a deep one-way record: Direction Match's row, and the
// one place the index must keep its mouth shut.
for (let i = 0; i < 5; i++) SEED.push(vote(80 + i, SPOKEN, "yea"));

// Sandbox A: shipped. Sandbox B: identical seeds, index switched off at the
// derivation — `_pdxRecordDirection` fails closed when it is missing, so B is
// exactly the product as it stood before this slice.
const A = boot(), B = boot();
A.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
B._recordDirectionIndex = undefined;
B.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
const CS = A.PDXConsistency, CSB = B.PDXConsistency;
const rowsA = CS.issueRows(PID), rowsB = CSB.issueRows(PID);
const rowOf = (k) => rowsA.filter((r) => r.key === k)[0];
const idx = (k, o) => A._pdxRecordDirection(PID, k, o || {});

// ═════════════════════════════════════════════════════════════════════════════
section("1 · Direction Match is byte-identical with the index live");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(rowsA.length, rowsB.length, "both sandboxes model the same rows");
  const byKeyB = {};
  rowsB.forEach((r) => { byKeyB[r.key] = r; });
  let scored = 0, dirRows = 0;
  for (const a of rowsA) {
    const b = byKeyB[a.key];
    ok(!!b, `${a.key}: the row exists in both sandboxes`);
    if (!b) continue;
    const ra = CS.rowResult(a), rb = CSB.rowResult(b);
    // Every scored quantity, both on the row model and on the result.
    eq(a.verdict.token, b.verdict.token, `${a.key}: the verdict token is unchanged`);
    eq(a.verdict.score, b.verdict.score, `${a.key}: the verdict score is unchanged`);
    eq(a.tested, b.tested, `${a.key}: testedness is unchanged`);
    eq(a.tier, b.tier, `${a.key}: the row's tier is unchanged`);
    eq(ra.pct, rb.pct, `${a.key}: the percentage is unchanged`);
    eq(ra.state, rb.state, `${a.key}: the result state is unchanged`);
    eq(JSON.stringify(ra.bucket), JSON.stringify(rb.bucket), `${a.key}: the bucket is unchanged`);
    eq(ra.metric, rb.metric, `${a.key}: the metric name is unchanged`);
    eq(ra.label, rb.label, `${a.key}: the verdict word is unchanged`);
    eq(ra.held, rb.held, `${a.key}: the inventory count is unchanged`);
    if (typeof ra.pct === "number") scored++;
    if (ra.dir) dirRows++;
  }
  ok(scored > 0, "the fixture actually scores something for the comparison to protect");
  ok(dirRows > 0, "…and the index actually attached itself to rows");
  eq(JSON.stringify(CS.verdictTally(PID)), JSON.stringify(CSB.verdictTally(PID)),
    "the profile's verdict tally is byte-identical");
  // NOT VACUOUS. If B rendered the same HTML as A, everything above would pass
  // for the wrong reason.
  const htmlA = CS.stancesSectionHtml(PID), htmlB = CSB.stancesSectionHtml(PID);
  ok(htmlA !== htmlB, "the two sandboxes really do render differently");
  ok(htmlA.length > htmlB.length, "…and the difference is the index adding, not removing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no percentage, anywhere the index speaks");
// ═════════════════════════════════════════════════════════════════════════════
{
  const strings = [];
  for (const r of rowsA) {
    const d = CS.rowResult(r).dir;
    if (d) strings.push(d.clause, d.summary, d.label);
  }
  ok(strings.length > 0, "the index produced copy to check");
  for (const s of strings) {
    lacks(s, "%", "index copy carries no percent sign");
    ok(!/\b\d+ ?(percent|pct)\b/i.test(s), "…and never spells one out either");
    ok(!/\bout of\b|\brate\b|\bshare\b/i.test(s),
      "…and never phrases the counts as a proportion");
  }
  // …and nothing shaped like a score leaked onto the rows it touched.
  const d = idx(DEEP);
  eq(typeof d.pct, "undefined", "the index return value has no percentage field");
  eq(typeof d.score, "undefined", "…and no score field");
  const chunkOf = (html, k) => {
    for (const c of html.split(/<div class="pdxst-row["\s]/).slice(1)) {
      if ((c.match(/data-pdxst-issue="([^"]*)"/) || [])[1] === k) return c;
    }
    return "";
  };
  const chunk = chunkOf(CS.stancesSectionHtml(PID), DEEP);
  ok(!!chunk, "the deep no-stance row renders");
  ok(!/class="pdxst-pct"[^>]*>\s*\d+%/.test(chunk), "no percentage is printed on it");
  has(chunk, "pdxst-pct-na", "…the result slot stays explicitly empty");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the tokens are its own — no lane blending");
// ═════════════════════════════════════════════════════════════════════════════
{
  const rd = Object.keys(A._PDX_RD_TOKENS || {});
  ok(rd.length >= 5, "the index defines its own token table");
  for (const k of rd) ok(/^record_/.test(k), `${k}: index tokens are prefixed record_`);
  const legis = Object.keys(A.PDXConsistency.VERDICTS || {});
  const exec = Object.keys(A.PDXExecRecord.VERDICTS || {});
  ok(legis.length && exec.length, "both verdict tables are reachable to compare against");
  for (const k of rd) {
    ok(legis.indexOf(k) === -1, `${k}: does not collide with a legislative verdict`);
    ok(exec.indexOf(k) === -1, `${k}: does not collide with an executive verdict`);
  }
  // …and the reverse: no verdict word is reused as an index label.
  const rdLabels = rd.map((k) => A._PDX_RD_TOKENS[k].label);
  const verdictLabels = legis.map((k) => A.PDXConsistency.VERDICTS[k].label)
    .concat(exec.map((k) => A.PDXExecRecord.VERDICTS[k].label));
  for (const l of rdLabels) {
    ok(verdictLabels.indexOf(l) === -1, `"${l}": is not a verdict word wearing a new key`);
  }
  // The vocabulary is the product's own effect language, not a stance axis.
  const d = idx(DEEP);
  ok(/cut against|advanced/.test(d.clause), "the clause speaks in advances / cuts against");
  for (const s of [d.clause, d.summary]) {
    ok(!/leans (support|oppose)|supports? this|opposes? this|stance|position on/i.test(s),
      "…and never in the language of a stated position");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · it never authors, seeds or implies a stance");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A row WITH a stated position is Direction Match's row. Five one-way votes
  // would characterise easily; the index declines because there is a real
  // metric here and a second reading of the same votes would compete with it.
  const spoken = rowOf(SPOKEN);
  eq(spoken.said, true, "the control row does have a stated position on file");
  const sres = CS.rowResult(spoken);
  ok(!sres.dir, "a row with a stated position gets no record-direction line");
  // The derivation is stance-free by signature: there is no argument to pass one
  // through, and nothing it returns names a position.
  const raw = A._recordDirectionIndex(DEEP, [], {});
  eq(raw.token, "record_none", "an empty record characterises nothing");
  eq(typeof raw.stance, "undefined", "the return value has no stance field");
  eq(typeof raw.supports, "undefined", "…and no supports field");
  eq(A._recordDirectionIndex.length, 3,
    "the derivation takes (issueKey, records, opts) — there is no stance parameter");
  ok(!/stance/i.test(R("stance-helpers.js").split("function _recordDirectionIndex")[1].slice(0, 3000)),
    "…and the body never so much as mentions one");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the thresholds, one case each");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(A._PDX_RD_MIN_JUDGED, 4, "the characterisation floor is four judged items");
  eq(A._PDX_RD_DOMINANCE, 0.75, "…and three quarters of the weight one way");

  // n = 14, 11 one way (79% of weight) → characterised.
  const deep = idx(DEEP);
  eq(deep.token, "record_direction", "a deep, dominant record is characterised");
  eq(deep.characterised, true, "…and says so");
  eq(deep.judged, 14, "…over every judged item");
  eq(deep.opposes, 11, "…counted on the side that cut against");
  eq(deep.advances, 3, "…and the side that advanced");
  eq(deep.lead, "opposes", "…with the lead naming the heavier side");
  eq(deep.clause, "11 cut against it, 3 advanced it",
    "…and the clause states both counts, heavier side first");

  // n = 2, both one way → the bare fact, and explicitly NOT a tendency.
  const uni = idx(UNIFORM);
  eq(uni.token, "record_uniform_thin", "two one-way votes are stated as the fact they are");
  eq(uni.clause, "both cut against it", "…in the plainest form available");
  ok(!/pattern|tend|usually|consistently|generally/i.test(uni.summary),
    "…and claim no broad tendency from two votes");

  // n = 3, two-to-one → under the floor, and mixed, so nothing is said.
  const mixed = idx(MIXED3);
  eq(mixed.judged, 3, "the three-vote fixture is judged in full");
  eq(mixed.token, "record_thin", "three mixed votes stay too thin to characterise");
  eq(mixed.clause, "", "…and produce no clause to print");

  // n = 1 → thin, as it always was.
  const solo = idx(SOLO);
  eq(solo.token, "record_thin", "a single vote characterises nothing");
  eq(solo.clause, "", "…and says nothing");

  // n = 6, three each → deep enough, and it declines anyway.
  const split = idx(SPLIT);
  eq(split.judged, 6, "the split fixture clears the depth floor");
  eq(split.token, "record_split", "…and is reported as running both ways");
  eq(split.characterised, false, "…which is not a characterisation");
  eq(split.clause, "they ran both ways", "…and reads as exactly that");
  ok(!/cut against it,|advanced it,/.test(split.clause),
    "…without implying a winner by ordering the counts");

  // A member we barely hold a record for gets no pattern at all, however
  // one-sided the handful we do hold looks.
  const thinWin = boot();
  const sparse = [];
  for (let i = 0; i < 5; i++) sparse.push(vote(i, DEEP, "nay"));
  thinWin.PDXVotingRecord.noteMember(PID, sparse);
  const floor = thinWin._pdxRecordDirection(PID, DEEP, {});
  ok(thinWin._pdxRecordMappedCounts(PID).votes < A._PDX_RD_MEMBER_FLOOR,
    "the sparse fixture sits below the member coverage floor");
  eq(floor.token, "record_thin", "…so five one-way votes still characterise nothing");
  eq(floor.suppressed, "coverage_floor", "…and the reason is recorded as the floor");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · keys whose label names a subject, not a direction, are suppressed");
// ═════════════════════════════════════════════════════════════════════════════
{
  // "…Balance" keys have no pole: four votes one way on a balance key would read
  // as four votes for a direction the heading never states.
  const bal = idx(BALANCE);
  eq(bal.judged, 4, "the balance-key fixture clears every depth threshold");
  eq(bal.token, "record_thin", "…and is characterised anyway — no");
  eq(bal.suppressed, "balance_key", "…with the suppression reason named");
  eq(bal.clause, "", "…and nothing printed on the row");
  const balRow = rowOf(BALANCE);
  if (balRow) {
    const res = CS.rowResult(balRow);
    ok(!res.dir || !res.dir.clause, "the balance row's face carries no direction clause");
    has(res.why, "on file", "…while still stating the inventory it holds");
  }
  // The hand-listed no-pole keys are suppressed by the same door.
  const noPole = Object.keys(A._PDX_RD_NO_POLE || {});
  ok(noPole.length > 0, "the no-pole list is populated");
  for (const k of noPole) {
    const out = A._recordDirectionIndex(k, SEED.map((v) => ({
      kind: "vote", position: "nay", isProcedural: false,
      issues: [{ issueKey: k, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
    })), { memberRecordCount: 99 });
    eq(out.suppressed, "no_pole", `${k}: a key that names a subject is suppressed`);
    eq(out.clause, "", `${k}: …and prints nothing`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the face adds up, and the count is still a door");
// ═════════════════════════════════════════════════════════════════════════════
{
  const deepRow = rowOf(DEEP);
  const res = CS.rowResult(deepRow);
  eq(res.shape, "no_stance", "the deep row is still classified as our gap, not their record");
  eq(res.pct, null, "…still unscored");
  eq(res.label, "Not scored yet", "…and still says so in the verdict slot");
  has(res.why, "14 votes on file", "the reason leads with the inventory");
  has(res.why, "11 cut against it, 3 advanced it", "…then says what those votes did");
  has(res.why, "no stated position from them yet", "…and why it is not a score");

  // THE ARITHMETIC ON THE FACE. `held` counts every instrument on file; the
  // index counts only the ones that took a side. Where they differ the clause
  // has to say so, or the row prints three numbers that do not add up.
  const abstained = SEED.slice();
  const win2 = boot();
  abstained.push(vote(200, DEEP, "present"), vote(201, DEEP, "not_voting"));
  win2.PDXVotingRecord.noteMember(PID, abstained.map((v) => JSON.parse(JSON.stringify(v))));
  const r2 = win2.PDXConsistency.issueRows(PID).filter((r) => r.key === DEEP)[0];
  const res2 = win2.PDXConsistency.rowResult(r2);
  ok(res2.held > res2.dir.judged, "the fixture really does hold items that took no side");
  has(res2.why, "of the " + res2.dir.judged + " that took a side",
    "…so the clause says which subset it is counting");
  const nums = (res2.why.match(/\d+/g) || []).map(Number);
  eq(nums[0], res2.held, "the face still leads with everything on file");
  ok(nums.indexOf(res2.dir.judged) > 0, "…and names the judged subset before the split");

  // THE DOOR. Unchanged by this slice, and pinned here because the whole point
  // of characterising a record is that the reader can go and check it.
  const html = CS.stancesSectionHtml(PID);
  let chunk = "";
  for (const c of html.split(/<div class="pdxst-row["\s]/).slice(1)) {
    if ((c.match(/data-pdxst-issue="([^"]*)"/) || [])[1] === DEEP) chunk = c;
  }
  const why = (chunk.match(/<div class="pdxst-why">[\s\S]*?<\/div>/) || [])[0] || "";
  has(why, "pdxst-why-go", "the reason line still carries a control");
  has(why, 'data-pdxst-dos="' + DEEP + '"', "…aimed at this issue's dossier");
  has(why, 'data-pdxst-focus="record"', "…landing on the formal enumeration");
  const items = CS.dossierItems(PID, DEEP) || [];
  eq(items.length, res.held, "…which lists exactly what the face advertised");

  // The tooltip is the whole sentence, because a screen reader gets it with no
  // heading in earshot to resolve "it" against.
  const resultDiv = (chunk.match(/<div class="pdxst-result[\s\S]*?<\/div>/) || [])[0] || "";
  const tip = (resultDiv.match(/title="([^"]*)"/) || [])[1] || "";
  has(tip, "recorded votes on", "the tooltip names the issue rather than saying “it”");
  lacks(tip, "%", "…and still shows no percentage");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the divider over these rows stopped calling them thin");
// ═════════════════════════════════════════════════════════════════════════════
{
  // These rows share the `limited` token with genuinely thin ones and sort into
  // the same tier, under one divider that said "Too thin to judge yet" — which
  // is the exact sentence the row face stopped telling. The divider now follows
  // the row's shape.
  const html = CS.stancesSectionHtml(PID);
  const subs = (html.match(/<div class="pdxst-sub">([^<]*)</g) || [])
    .map((s) => s.replace(/^.*">/, "").replace(/<$/, ""));
  ok(subs.length > 0, "the group still draws a divider before its unscored rows");
  has(subs.join(" | "), "nothing stated to test it against",
    "…and names our gap over the rows that are ours to fix");
  // …and it is still available, unchanged, for a row that really is thin.
  ok(/Too thin to judge yet/.test(R("consistency.js")),
    "the thin divider is still there for the rows it was true of");
}

if (failures.length) {
  console.error(`\n✗ record direction: ${failures.length} failure(s)`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log(`\n✓ record direction: all ${passed} assertions passed — ${
  idx(DEEP).summary} · Direction Match byte-identical either way`);
