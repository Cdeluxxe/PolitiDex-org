#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-depth-no-score-drift.mjs — the pass changed what is said, not what is true
// ─────────────────────────────────────────────────────────────────────────────
// A depth caption is worth having only if it is a caption. The moment printing
// "3 issues tested" beside a score also nudges the score — a floor raised so the
// embarrassing 100%s stop appearing, a thin row quietly dropped from the tested
// pool so the denominator looks better — the disclosure has become a second
// scoring pass wearing a caption's clothes, and the honest-looking number is less
// honest than the bare one it replaced.
//
// So this file does not inspect the diff and reason about it. It boots the tree as
// it stood before the pass and the tree as it stands now, side by side in two vm
// contexts, runs both engines over the whole roster, and requires the published
// arithmetic to come out bit-for-bit identical:
//
//   · read()      — pct, publishable, tested, untested, scorable, word, testedWeight
//   · scopedRead()— the same, for the current-term slice and its delta
//   · rowResult() — per-issue state, pct, metric and verdict token, every row
//
// Anything that moves, fails, and names itself. A floor raised to hide a thin
// perfect score would surface here as a profile that used to publish and no longer
// does; a row dropped to flatter a denominator, as a coverage count that shrank.
//
// The baseline is HEAD, read through `git show` — this file never reaches into the
// .git directory itself.
//
//   node scripts/test-depth-no-score-drift.mjs

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Every file the score is computed from, in load order. Presentation-only files
// (css, hero-showcase, ballot-breakdown, index.html) are absent by design: they
// cannot reach the arithmetic, and loading them would let a rendering difference
// masquerade as a scoring one.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "consistency.js", "voting-record.js", "word-action.js",
];

const nowSrc = (f) => readFileSync(join(ROOT, f), "utf8");
const headSrc = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) { return null; }
};

function boot(get, label) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of FILES) {
    const src = get(f);
    if (src === null) { console.error(`  ! ${label}: ${f} unavailable`); continue; }
    try { vm.runInContext(src, ctx, { filename: `${label}:${f}` }); }
    catch (e) { console.error(`  ! ${label}/${f}: ${e.message}`); }
  }
  return win;
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

section("booting both trees");
const before = boot(headSrc, "HEAD");
const after = boot(nowSrc, "working");
ok(!!(before.PDXWordAction && before.PDXWordAction.read), "the pre-pass engine booted");
ok(!!(after.PDXWordAction && after.PDXWordAction.read), "the current engine booted");
if (failures.length) {
  console.error(`\n✗ score drift: could not boot both trees\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}

const PIDS = Object.keys(before.CMP_DATA || {});
ok(PIDS.length > 100, `the roster booted (${PIDS.length} profiles)`);
{
  const now = Object.keys(after.CMP_DATA || {});
  eq(now.length, PIDS.length, "the pass added and removed nobody");
  eq(now.join("|"), PIDS.join("|"), "…and reordered nobody");
}

// ═════════════════════════════════════════════════════════════════════════════
section("read() — the published figure, its floors, and its coverage");
// ═════════════════════════════════════════════════════════════════════════════
// The whole shape, not just pct. `publishable` is where a raised floor would show;
// `tested`/`scorable` is where a quietly re-pooled row would.
const READ_KEYS = ["pct", "publishable", "word", "testedWeight"];
const COV_KEYS = ["word", "scorable", "tested", "untested", "issueLinked",
                  "notIssueLinked", "recordDerived", "warming"];

// ── Profiles this pass curated, and what that is allowed to move ─────────────
// Comparing the working tree to HEAD catches a formula that drifted. Read
// literally it also catches a curator who added a sourced position, because a
// profile with one more stated position has one more word row — and that is the
// work, not the drift. Freezing coverage forever would make this file a freeze on
// curation, which is not what it was written to protect.
//
// So a named profile may move its COVERAGE, and nothing else. `pct`,
// `publishable` and `testedWeight` are still held bit-for-bit for everyone, every
// row that exists in both trees is still compared in full, and a curated profile
// has the extra burden of showing that its rows only ever GREW: same rows, same
// order, additions at the end. A floor lowered or a row quietly dropped still
// fails here, on this list or off it.
//
// August 2026 densification pass — scripts/vr-densify-stances-aug2026.mjs:
//   french_hill / gov_regulation  · re-sourced off a vote-derived sentence
//   massie      / privacy_rights  · re-sourced off a vote-derived sentence
//   boebert     / privacy_rights  · first sourced position on the key
const CURATED = {
  french_hill: "gov_regulation re-sourced from a Financial Services letter",
  massie: "privacy_rights re-sourced from the Surveillance Accountability Act release",
  boebert: "privacy_rights added from her own quoted statement",
};

let published = 0, thinPerfect = 0, curated = 0;
for (const pid of PIDS) {
  const p = before.CMP_DATA[pid];
  let a = null, b = null;
  try { a = before.PDXWordAction.read(pid, p); } catch (e) { a = { __err: String(e) }; }
  try { b = after.PDXWordAction.read(pid, after.CMP_DATA[pid]); } catch (e) { b = { __err: String(e) }; }

  ok(!!a === !!b, `${pid}: both engines return a read (or neither does)`);
  if (!a || !b) continue;
  eq(b.__err, a.__err, `${pid}: the read did not start or stop throwing`);

  for (const k of READ_KEYS) {
    eq(JSON.stringify(b[k]), JSON.stringify(a[k]), `${pid}: read().${k} is unchanged`);
  }
  const ca = a.coverage || {}, cb = b.coverage || {};
  if (CURATED[pid]) {
    // Coverage may move — the score may not, and it is held above with READ_KEYS.
    // What is checked instead is that the movement is depth: the pool of positions
    // this profile can be tested on never shrank.
    // Not `word` on its own: re-sourcing a vote-derived sentence can retire a
    // branding placeholder the engine only emitted because the key had no real
    // position, which drops the raw count while improving the record. The
    // invariant that holds is the one that matters — the number of positions
    // standing on their OWN evidence never falls.
    ok((cb.word - cb.recordDerived) >= (ca.word - ca.recordDerived),
      `${pid}: curated (${CURATED[pid]}) — independently-sourced positions did not fall away`);
    ok(cb.scorable >= ca.scorable, `${pid}: curated (${CURATED[pid]}) — the scorable pool did not shrink`);
    ok(cb.recordDerived <= ca.recordDerived, `${pid}: curated (${CURATED[pid]}) — no position became record-derived`);
    eq(cb.warming, ca.warming, `${pid}: curated (${CURATED[pid]}) — warming state is unchanged`);
    curated++;
  } else {
    for (const k of COV_KEYS) {
      eq(cb[k], ca[k], `${pid}: coverage.${k} is unchanged`);
    }
  }

  if (a.publishable && typeof a.pct === "number") {
    published++;
    // THE CASE THE PASS EXISTS FOR must still be published. Raising a floor to
    // stop printing thin perfect scores is the tempting fix and the forbidden one.
    if (a.pct >= 90 && ca.tested <= 6) {
      thinPerfect++;
      ok(b.publishable === true,
        `${pid} publishes ${a.pct}% on ${ca.tested} tested issues and still does — ` +
        `the pass discloses thin scores, it does not suppress them`);
      eq(b.pct, a.pct, `${pid}: …at the same figure, unrounded and unmoved`);
    }
  } else {
    // And nothing became publishable either. Depth is not a licence to lower a bar.
    ok(!b.publishable || !a.publishable === !b.publishable,
      `${pid}: an unpublishable read did not become publishable`);
  }
}
console.log(`      (published figures compared: ${published}; of them thin-and-near-perfect: ${thinPerfect}; curated this pass: ${curated})`);
eq(curated, Object.keys(CURATED).length,
  "every profile on the curated list was actually reached — a stale name would hide a real freeze");
ok(published > 0, "there were published figures to compare");
ok(thinPerfect > 0, "…including the thin, near-perfect ones this pass is about");

// ═════════════════════════════════════════════════════════════════════════════
section("scopedRead() — the current-term slice reads the same too");
// ═════════════════════════════════════════════════════════════════════════════
let scoped = 0;
for (const pid of PIDS) {
  let a = null, b = null;
  try { a = before.PDXWordAction.scopedRead(pid, before.CMP_DATA[pid]); } catch (e) { continue; }
  try { b = after.PDXWordAction.scopedRead(pid, after.CMP_DATA[pid]); } catch (e) { b = null; }
  if (!a) continue;
  ok(!!b, `${pid}: the scoped read still returns`);
  if (!b) continue;
  scoped++;
  eq(b.applicable, a.applicable, `${pid}: scope applicability is unchanged`);
  eq(JSON.stringify(b.scope), JSON.stringify(a.scope), `${pid}: the scope itself is unchanged`);
  eq(JSON.stringify(b.delta), JSON.stringify(a.delta), `${pid}: the all-time/term delta is unchanged`);
  for (const slice of ["main", "current"]) {
    const sa = a[slice], sb = b[slice];
    ok(!!sa === !!sb, `${pid}: the ${slice} slice is present in both`);
    if (!sa || !sb) continue;
    eq(sb.pct, sa.pct, `${pid}: ${slice}.pct is unchanged`);
    eq(sb.publishable, sa.publishable, `${pid}: ${slice}.publishable is unchanged`);
    if (CURATED[pid]) {
      ok(sb.coverage.tested >= sa.coverage.tested, `${pid}: ${slice} tested count did not fall`);
      ok(sb.coverage.scorable >= sa.coverage.scorable, `${pid}: ${slice} scorable pool did not shrink`);
    } else {
      eq(sb.coverage.tested, sa.coverage.tested, `${pid}: ${slice} tested count is unchanged`);
      eq(sb.coverage.scorable, sa.coverage.scorable, `${pid}: ${slice} scorable pool is unchanged`);
    }
  }
}
console.log(`      (scoped reads compared: ${scoped})`);

// ═════════════════════════════════════════════════════════════════════════════
section("rowResult() — every issue row, one at a time");
// ═════════════════════════════════════════════════════════════════════════════
// The per-issue figures the marker sits beside. If adding a chip changed a row's
// state, metric or percentage, the marker would be editing the finding.
let rows = 0, tested = 0;
for (const pid of PIDS) {
  let ra = [], rb = [];
  try { ra = before.PDXConsistency.issueRows(pid) || []; } catch (e) { continue; }
  try { rb = after.PDXConsistency.issueRows(pid) || []; } catch (e) { rb = []; }
  const keysA = ra.map((r) => r.key), keysB = rb.map((r) => r.key);
  if (CURATED[pid]) {
    // Same rows, same order, additions only. A row that vanished or moved would
    // still fail — this is a superset check, not a waiver.
    ok(keysB.length >= keysA.length, `${pid}: curated — the row list did not shrink`);
    eq(keysB.slice(0, keysA.length).join("|"), keysA.join("|"),
      `${pid}: curated — every pre-existing row is still there, in the same order`);
  } else {
    eq(rb.length, ra.length, `${pid}: the same number of issue rows`);
    eq(keysB.join("|"), keysA.join("|"), `${pid}: the same issue rows, in the same order`);
  }
  const byKey = {};
  for (const r of rb) byKey[r.key] = r;
  for (const r of ra) {
    const q = byKey[r.key];
    if (!q) continue;
    rows++;
    let sa = null, sb = null;
    try { sa = before.PDXConsistency.rowResult(r); } catch (e) { sa = { __err: 1 }; }
    try { sb = after.PDXConsistency.rowResult(q); } catch (e) { sb = { __err: 1 }; }
    eq(!!sb, !!sa, `${pid}/${r.key}: both engines resolve the row`);
    if (!sa || !sb) continue;
    eq(sb.state, sa.state, `${pid}/${r.key}: row state is unchanged`);
    eq(sb.metric, sa.metric, `${pid}/${r.key}: row metric is unchanged`);
    eq(sb.pct, sa.pct, `${pid}/${r.key}: row percentage is unchanged`);
    eq((q.verdict || {}).token, (r.verdict || {}).token,
      `${pid}/${r.key}: the verdict is unchanged — the marker is depth, not an outcome`);
    eq((q.verdict || {}).basis, (r.verdict || {}).basis,
      `${pid}/${r.key}: …and it is still decided in the same lane`);
    if (sa.state === "tested") tested++;
  }
}
console.log(`      (issue rows compared: ${rows}; tested among them: ${tested})`);
ok(rows > 500, "the row sweep was wide enough to mean something");
ok(tested > 0, "…and included tested rows");

// ═════════════════════════════════════════════════════════════════════════════
section("the floors themselves");
// ═════════════════════════════════════════════════════════════════════════════
// Belt and braces: the constants are legible in the source, so read them from both
// trees and compare the literals. A floor could in principle move without changing
// any current profile's outcome, and that would still be a floor moving.
const grab = (src, name) => {
  const m = src.match(new RegExp("\\b" + name + "\\s*=\\s*([0-9]+)"));
  return m ? m[1] : null;
};
for (const name of ["MIN_TESTED_ITEMS", "MIN_TESTED_WEIGHT", "EVIDENCE_CAP"]) {
  const a = grab(headSrc("word-action.js") || "", name);
  const b = grab(nowSrc("word-action.js"), name);
  ok(a !== null, `${name} is findable in the pre-pass source`);
  eq(b, a, `${name} is the same integer it was`);
}

console.log("");
if (failures.length) {
  console.error(`✗ score drift: ${failures.length} failure(s), ${passed} passed\n`);
  failures.slice(0, 40).forEach((f) => console.error(`   · ${f}`));
  if (failures.length > 40) console.error(`   · …and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`✓ score drift: none — the pass changed what is said, not what is scored — ${passed} assertions passed\n`);
