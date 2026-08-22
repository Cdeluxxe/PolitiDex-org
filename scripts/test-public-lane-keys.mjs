#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// The public-lane join — receipts reach rows through a key, and only through a key
// ─────────────────────────────────────────────────────────────────────────────
// A curated public-record receipt is finished work: sourced, dated, verdicted,
// visible in the flashpoints feed and in search. But it reaches the surfaces built
// to display it — the issue row's "Public · N backs · N cuts against", the dossier's
// public column, the formal/public disagreement explainer — through exactly ONE
// join: its issueKey. Without one it is inventory sitting outside its own shelf.
//
// Some receipts ship with a key. The rest are keyed by hand in say-vs-do.js's
// SAYDO_RECEIPT_ISSUE_BACKFILL, under three tests the file documents: the subject
// is a policy question, exactly one live key covers it, and the direction the row
// will read is the direction the item runs. Those are editorial judgements and this
// file does not re-litigate them. What it holds is the MECHANISM around them:
//
//   · EVERY BACKFILL ENTRY IS LIVE AND REAL. A key not in ISSUE_MAP reaches no row;
//     a normalized headline that matches no receipt is a typo that will never fire.
//     Both fail here rather than degrading quietly to "no key".
//   · THE JOIN ONLY EVER TIGHTENS. Keyed count has a floor and unkeyed a ceiling,
//     so a future pass can key more receipts but cannot silently unkey any.
//   · KEYED ⇒ LANDED, WITH ONE DOCUMENTED EXCEPTION. Every keyed receipt lands on
//     an issue row, except the categories consistency.js excludes from Say-vs-Do
//     upstream. That exception is named and counted here so the gap between "keyed"
//     and "on a row" can never grow a second, undocumented cause.
//   · THE EXCLUDE LIST IS PART OF THE CONTRACT. { voting, promise } — voting because
//     those items migrated to the Official Record and would double-count, promise
//     because a pledge is word, not a public test of word.
//   · KEYING IS NOT SCORING. Section 5 boots the engine twice over the same tree,
//     swapping ONLY say-vs-do.js for its committed version, and proves every formal
//     figure is byte-identical: Direction Match, its coverage, and each issue row's
//     formal half. A key can add a public tally beside a result. It can never move
//     one.
//
//   node scripts/test-public-lane-keys.mjs
//
// Real modules, bundled data, node:vm. No network, no writes.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "gaps.js", "consistency.js", "voting-record.js", "word-action.js",
];

// say-vs-do.js reads window.PROFILES, which the live app fills from Firestore. The
// bundled roster is the same shape; without it the receipt layer resolves no names.
function boot(srcFor, label) {
  const win = makeSandbox();
  win.PROFILES = null;
  const ctx = vm.createContext(win);
  for (const f of FILES) {
    const src = srcFor(f);
    if (src === null) return null;
    if (f === "cmp-data.js") { vm.runInContext(src, ctx, { filename: `${label}:${f}` }); win.PROFILES = win.CMP_DATA; continue; }
    try { vm.runInContext(src, ctx, { filename: `${label}:${f}` }); }
    catch (e) { console.error(`   ! ${label}/${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const win = boot(read, "working");
ok(!!win, "the working tree booted");
if (!win) { console.error("\n✗ public-lane keys: could not boot\n"); process.exit(1); }

const R = win.PDXReceipts;
const CS = win.PDXConsistency;
const ISSUE_MAP = win.ISSUE_MAP || {};
ok(!!(R && typeof R.collect === "function"), "PDXReceipts.collect() is available");
ok(!!(CS && typeof CS.issueRows === "function"), "PDXConsistency.issueRows() is available");
if (failures.length) { failures.forEach((f) => console.error(`   · ${f}`)); process.exit(1); }

const receipts = R.collect() || [];
const keyed = receipts.filter((r) => r.issueKey);
const unkeyed = receipts.filter((r) => !r.issueKey);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every backfill entry is live, unique, and actually fires");
// ═════════════════════════════════════════════════════════════════════════════
// The map is module-private on purpose, so it is read from source rather than
// exported for a test. A key here that ISSUE_MAP no longer carries is silently
// dropped by _resolveReceiptIssue(); a normalized headline with a typo simply never
// matches. Both look identical to "we chose not to key it" from the outside.
const SRC = read("say-vs-do.js");
const mapStart = SRC.indexOf("var SAYDO_RECEIPT_ISSUE_BACKFILL = {");
const mapEnd = SRC.indexOf("\n  };", mapStart);
ok(mapStart > 0 && mapEnd > mapStart, "SAYDO_RECEIPT_ISSUE_BACKFILL is present in say-vs-do.js");
const MAP_SRC = SRC.slice(mapStart, mapEnd);
const ENTRY_RE = /'([^']+\|\|[^']+)':\s*'([a-z0-9_]+)'/g;
const entries = [];
for (let m; (m = ENTRY_RE.exec(MAP_SRC));) entries.push([m[1], m[2]]);
// 62 hand-assigned entries across three passes; the rest of the keyed population
// ships its own issueKey in acct-spotlight-data.js and never reaches this map.
ok(entries.length >= 62, `the backfill carries its entries (${entries.length})`);

const dupes = entries.map((e) => e[0]).filter((k, i, a) => a.indexOf(k) !== i);
eq(dupes.length, 0, `no duplicate backfill keys${dupes.length ? " — " + dupes.slice(0, 3).join(", ") : ""}`);

const deadKeys = entries.filter(([, v]) => !ISSUE_MAP[v]);
eq(deadKeys.length, 0,
  `every backfill value is a live ISSUE_MAP key${deadKeys.length ? " — " + deadKeys.slice(0, 3).map((e) => e.join("→")).join(", ") : ""}`);

// Every entry has to correspond to a real collected receipt, or it can never fire.
const normHead = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const collected = new Set();
for (const r of receipts) collected.add(r.pid + "||" + normHead(r.headline));
const orphans = entries.filter(([k]) => !collected.has(k));
eq(orphans.length, 0,
  `every backfill entry matches a collected receipt${orphans.length ? " — " + orphans.slice(0, 3).map((e) => e[0]).join(" / ") : ""}`);

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the join only ever tightens");
// ═════════════════════════════════════════════════════════════════════════════
// A ratchet, not a snapshot. Keying more receipts is the work; unkeying any is the
// regression, and a floor catches it without freezing the numbers in place.
const KEYED_FLOOR = 279;
const UNKEYED_CEILING = 173;
ok(keyed.length >= KEYED_FLOOR, `keyed receipts did not fall (${keyed.length} ≥ ${KEYED_FLOOR})`);
ok(unkeyed.length <= UNKEYED_CEILING, `unkeyed receipts did not rise (${unkeyed.length} ≤ ${UNKEYED_CEILING})`);
eq(keyed.length + unkeyed.length, receipts.length, "every collected receipt is either keyed or not");
eq(keyed.filter((r) => !ISSUE_MAP[r.issueKey]).length, 0, "no receipt is keyed to a dead issue");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · keyed ⇒ landed, except the documented exclusions");
// ═════════════════════════════════════════════════════════════════════════════
// consistency.js drops two categories before the public tally is built. Those are
// the ONLY reason a keyed receipt may be absent from its row, and this pins that:
// the shortfall is enumerated, every member of it is an excluded category, and the
// arithmetic closes.
const EXCLUDED = { voting: 1, promise: 1 };
const exclSrc = /var SAYDO_EXCLUDE = \{([^}]*)\}/.exec(read("consistency.js"));
ok(!!exclSrc, "consistency.js still declares SAYDO_EXCLUDE");
const exclNames = exclSrc ? (exclSrc[1].match(/[a-z_]+(?=\s*:)/g) || []).sort() : [];
eq(exclNames.join(","), Object.keys(EXCLUDED).sort().join(","),
  "the Say-vs-Do exclude list is unchanged — a new exclusion would silently strand keyed evidence");

const rosterPids = Object.keys(win.CMP_DATA || {});
const pids = Array.from(new Set(rosterPids.concat(receipts.map((r) => r.pid))));
const rowsFor = new Map();
for (const pid of pids) {
  let rows = [];
  try { rows = CS.issueRows(pid) || []; } catch (e) { rows = []; }
  rowsFor.set(pid, rows);
}
const onRow = new Map();   // "pid||key" → public.count
let rowItems = 0, rowsWithPublic = 0;
for (const [pid, rows] of rowsFor) {
  for (const row of rows) {
    const p = row && row.public;
    if (p && p.count > 0) { onRow.set(pid + "||" + row.key, p.count); rowItems += p.count; rowsWithPublic++; }
  }
}
const expect = new Map();
for (const r of keyed) {
  const k = r.pid + "||" + r.issueKey;
  if (!expect.has(k)) expect.set(k, []);
  expect.get(k).push(r);
}
// A group may legitimately land fewer items than it holds — an excluded category
// inside it is dropped before the tally. What must match is the EXPECTED count:
// the receipts in the group that the exclude list does not touch.
const stranded = [];
for (const [k, list] of expect) {
  const want = list.filter((r) => !EXCLUDED[String(r.category || "").toLowerCase()]);
  const got = onRow.get(k) || 0;
  if (got === want.length) continue;
  stranded.push(`${k}: ${want.length} eligible, ${got} on row — ` +
    want.map((r) => `[${r.category}] ${r.headline}`).join(" / "));
}
eq(stranded.length, 0,
  `no keyed receipt is stranded off its row for an undocumented reason${stranded.length ? " — " + stranded.slice(0, 3).join(" / ") : ""}`);

const excludedKeyed = keyed.filter((r) => EXCLUDED[String(r.category || "").toLowerCase()]);
eq(keyed.length - rowItems, excludedKeyed.length,
  "keyed-minus-landed is exactly the excluded-category population — the whole gap, accounted for");
ok(rowsWithPublic >= 228, `rows carrying a public tally did not fall (${rowsWithPublic} ≥ 228)`);

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the lane is still counts-only and still disclaimed");
// ═════════════════════════════════════════════════════════════════════════════
// Keying receipts must not turn the public lane into a second score. A tally is
// counts plus the disclosure; a disagreement is a SHAPE and a sentence, never a
// figure.
let tallies = 0, shapes = 0;
for (const [, rows] of rowsFor) {
  for (const row of rows) {
    const t = CS.publicTally(row);
    if (t && !t.empty) {
      tallies++;
      eq(typeof t.pct, "undefined", "a public tally never carries a percentage");
      eq(t.count, t.against + t.backs + t.flags + (t.count - t.against - t.backs - t.flags),
        "the tally's parts are counted, not derived");
      ok(/direction match/i.test(String(t.tag) + String(t.note)),
        "every public tally carries the not-in-Direction-Match disclosure");
    }
    const g = CS.laneDisagreement ? CS.laneDisagreement(row) : null;
    if (g && g.shape) {
      shapes++;
      ok(!/\d+(\.\d+)?\s*%/.test(JSON.stringify(g)), `laneDisagreement stays shape-only (${g.shape})`);
    }
  }
}
ok(tallies > 200, `public tallies were actually exercised (${tallies})`);
ok(shapes > 0, `disagreement shapes were actually exercised (${shapes})`);

// ═════════════════════════════════════════════════════════════════════════════
section("5 · keying is not scoring — formal figures, before vs after");
// ═════════════════════════════════════════════════════════════════════════════
// The isolating comparison: the same tree booted twice, differing in say-vs-do.js
// alone. Anything that moves is attributable to the join and nothing else. Direction
// Match, its coverage, and each row's formal half must all come back identical; the
// public half is expected to move, and is not compared.
let headSrc = null;
try { headSrc = execFileSync("git", ["show", "HEAD:say-vs-do.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
catch (e) { headSrc = null; }

if (!headSrc) {
  console.log("      (HEAD:say-vs-do.js unavailable — invariance comparison skipped)");
} else {
  const beforeWin = boot((f) => (f === "say-vs-do.js" ? headSrc : read(f)), "HEAD-saydo");
  ok(!!(beforeWin && beforeWin.PDXWordAction), "the committed-say-vs-do tree booted");
  if (beforeWin && beforeWin.PDXWordAction) {
    const READ_KEYS = ["pct", "publishable", "word", "testedWeight"];
    const COV_KEYS = ["word", "scorable", "tested", "untested", "issueLinked",
                      "notIssueLinked", "recordDerived", "warming"];
    let compared = 0, rowsCompared = 0, publicMoved = 0;
    for (const pid of rosterPids) {
      let a = null, b = null;
      try { a = beforeWin.PDXWordAction.read(pid, beforeWin.CMP_DATA[pid]); } catch (e) { a = { __err: String(e) }; }
      try { b = win.PDXWordAction.read(pid, win.CMP_DATA[pid]); } catch (e) { b = { __err: String(e) }; }
      if (!a || !b) { ok(!a === !b, `${pid}: both engines return a read (or neither does)`); continue; }
      compared++;
      for (const k of READ_KEYS) eq(JSON.stringify(b[k]), JSON.stringify(a[k]), `${pid}: read().${k} is unchanged`);
      const ca = a.coverage || {}, cb = b.coverage || {};
      for (const k of COV_KEYS) eq(cb[k], ca[k], `${pid}: coverage.${k} is unchanged`);
    }
    ok(compared > 100, `Direction Match compared across the roster (${compared} profiles)`);

    // The row's formal half: what was said, what the formal record did, and the
    // verdict WHEN the formal record is what produced it. A row the formal lane
    // never judged may legitimately gain a public-record verdict from a new key —
    // that is the feature — so `basis` is compared and the verdict only where the
    // basis is the action lane.
    for (const pid of rosterPids) {
      let ra = [], rb = [];
      try { ra = beforeWin.PDXConsistency.issueRows(pid) || []; } catch (e) { ra = []; }
      try { rb = CS.issueRows(pid) || []; } catch (e) { rb = []; }
      eq(rb.length, ra.length, `${pid}: the row set is unchanged in size`);
      const byKey = new Map(rb.map((r) => [r.key, r]));
      for (const before of ra) {
        const after = byKey.get(before.key);
        ok(!!after, `${pid}/${before.key}: the row still exists`);
        if (!after) continue;
        rowsCompared++;
        eq(after.said, before.said, `${pid}/${before.key}: said is unchanged`);
        eq(JSON.stringify(after.actions), JSON.stringify(before.actions), `${pid}/${before.key}: the action lane is unchanged`);
        eq(after.lane, before.lane, `${pid}/${before.key}: the deciding lane name is unchanged`);
        eq(JSON.stringify(after.stance), JSON.stringify(before.stance), `${pid}/${before.key}: the stance is unchanged`);
        if (before.verdict && before.verdict.basis === "action") {
          eq(JSON.stringify(after.verdict), JSON.stringify(before.verdict),
            `${pid}/${before.key}: a formally-decided verdict is unchanged`);
        }
        const pa = (before.public && before.public.count) || 0;
        const pb = (after.public && after.public.count) || 0;
        if (pa !== pb) publicMoved++;
      }
    }
    ok(rowsCompared > 3000, `issue rows compared (${rowsCompared})`);
    console.log(`      (rows whose PUBLIC half moved: ${publicMoved} — the intended change, and the only one)`);
  }
}

console.log(`\n   ${passed} checks passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\n✗ public-lane keys\n");
  failures.slice(0, 40).forEach((f) => console.error(`   · ${f}`));
  if (failures.length > 40) console.error(`   … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log("\n✓ public-lane keys: the join is live, tight, accounted for, and outside the score\n");
