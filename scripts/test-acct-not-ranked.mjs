#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-acct-not-ranked.mjs — a retired grade may not order people
// ─────────────────────────────────────────────────────────────────────────────
// accountability-score.js computes a composite: one 0–100 per politician, with a
// five-rung moral ladder over it — "Highly Accountable", "Mostly Accountable",
// "Mixed", "Questionable", "Low Accountability". Earlier passes retired it from
// every surface that PRINTED it: the card badge, the profile ring, the medium
// card's dual-score header, the People's Mandate scorecard, the Key Races cell,
// and the three buttons that opened the full analysis.
//
// It kept ranking anyway. The number was still reachable as window._acctMatchScore
// (a memo in alignment-tool.js), still computable on demand as
// window._acctEnsureScore (a getter in accountability-score.js that would run the
// analyzer and write the result onto PROFILES and CMP_DATA), and the browse
// comparator still had a branch — `sort === 'acct-desc'`, offered in the sort
// select as "🛡️ Accountability: High → Low" — that ordered the entire roster by
// it. A quick chip did the same thing sideways: "🛡️ High accountability" filtered
// the roster to composite ≥ 65 and forced that sort on.
//
// An unprinted grade that decides who appears first is still the grade deciding.
// This file is the fence around its removal:
//
//   1. THE ACCESSORS ARE GONE. No shipped module defines, exports or calls
//      _acctMatchScore / _acctEnsureScore / _acctMatchCacheBust / _acctHighOnly.
//   2. THE SORT KEY IS GONE — from the comparator and from the markup that could
//      produce it. Every surviving browse sort key is named and non-moral.
//   3. THE COMPARATOR CANNOT REACH THE COMPOSITE. The real browse comparator is
//      lifted out of compare-hub.js and run against profiles whose `accountability`
//      is a landmine and a window whose /acct/ globals throw. Every shipped sort
//      key completes; a stale 'acct-desc' falls through to input order.
//   4. DIRECTION MATCH DOES NOT CONSUME IT. read() is byte-identical with the
//      composite present, absent, and set to both extremes — proven by mutation,
//      not by a stored snapshot.
//   5. FORMAL-FIRST IS UNTOUCHED. Atlas count, browse chip and shape hero still
//      render, still agree, and still publish counts rather than a grade.
//   6. NO BAND LABEL SURVIVES ON A MEMBER SURFACE. The five rung names appear in
//      no reader-facing module's code, and no reader-facing module prints a
//      "…/100" beside them.
//   7. NO NEW PERCENTAGE. Nothing this pass added publishes a figure.
//
//   node scripts/test-acct-not-ranked.mjs
//
// Real shipped modules in a node:vm sandbox. No database, no network.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// Source assertions read CODE, never the comments about the code. This whole
// pass is documented in retirement notes that name the thing they forbid; a scan
// that could not tell the two apart would force the notes to be deleted, which
// is the opposite of what keeps the grade out.
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) =>
  ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ acct not ranked: ${m}`); process.exit(1); };

const OWNER = "accountability-score.js";
const SHIPPED = readdirSync(ROOT)
  .filter((f) => f.endsWith(".js") && !f.startsWith("sw") && !f.includes(".min."));
must(SHIPPED.length > 40, `the sweep sees the shipped module set (${SHIPPED.length} files)`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the accessors the composite ranked through are gone");
// ═════════════════════════════════════════════════════════════════════════════
{
  // _acctMatchScore    — the memoized 0–100 the comparator called per pid.
  // _acctEnsureScore   — the on-demand analyzer run that fed it, and that wrote
  //                      the freshly computed grade onto PROFILES / CMP_DATA.
  // _acctMatchCacheBust— the invalidator, whose existence is proof of a live memo.
  // _acctHighOnly      — the browse flag that filtered the roster by the grade.
  const RETIRED = [
    "_acctMatchScore",
    "_acctEnsureScore",
    "_acctMatchCacheBust",
    "_acctHighOnly",
  ];
  for (const name of RETIRED) {
    const hits = SHIPPED.filter((f) => CODE(f).includes(name));
    eq(hits.length, 0, `no shipped module mentions ${name} in code — found in ${hits.join(", ")}`);
    ok(!R("index.html").replace(/<!--[\s\S]*?-->/g, "").includes(name),
      `index.html does not wire up ${name}`);
  }

  // The two files that used to bust the memo when new depth arrived must have
  // dropped the call rather than kept a dangling optional one.
  ok(!/_acctMatchCacheBust/.test(CODE("firebase-boot.js")),
    "firebase-boot.js still busts a cache that no longer exists");
  ok(!/_acctMatchCacheBust/.test(CODE(OWNER)),
    `${OWNER} still busts the retired match memo after computing a score`);

  // The engine itself is deliberately NOT deleted — it is the same disposition as
  // the badge and the overlay (retired, unreachable, still in the repo). What
  // must be true is that nothing outside its own file can run it.
  ok(/AccountabilityAnalyzer/.test(R(OWNER)),
    `${OWNER} still contains the analyzer (retired, not deleted)`);
  const outside = SHIPPED.filter((f) => f !== OWNER && CODE(f).includes("AccountabilityAnalyzer"));
  eq(outside.length, 0, `no module outside the owner runs the analyzer — found in ${outside.join(", ")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the sort key is gone from the comparator and from the markup");
// ═════════════════════════════════════════════════════════════════════════════
{
  const html = R("index.html").replace(/<!--[\s\S]*?-->/g, "");
  for (const key of ["acct-desc", "acct-asc", "acct-high"]) {
    ok(!html.includes(key), `index.html offers no <option>/handler producing ${key}`);
    const hits = SHIPPED.filter((f) => CODE(f).includes(key));
    eq(hits.length, 0, `no shipped module reads or writes the sort key ${key} — found in ${hits.join(", ")}`);
  }

  // The sort select is the only thing that can produce a browse sort value —
  // compare-hub reads `document.getElementById('myteam-browse-sort').value`
  // directly, with no localStorage restore — so enumerating its options
  // enumerates every sort a reader can reach.
  const sel = R("index.html").match(/<select id="myteam-browse-sort"[\s\S]*?<\/select>/);
  must(sel, "the browse sort <select> moved — this gate can no longer enumerate the sorts");
  const OFFERED = [...sel[0].matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]).sort();
  // Each surviving key, and why it is not a moral grade.
  const SANCTIONED = {
    "score-desc": "⚖️ Word vs Action depth — coverage counts, the one published read",
    "align-desc": "the reader's own issue match, computed from their selections",
    "alpha": "name, A–Z",
  };
  eq(JSON.stringify(OFFERED), JSON.stringify(Object.keys(SANCTIONED).sort()),
    "the browse sort select offers a key this file has not documented as non-moral");
  for (const k of OFFERED) ok(!!SANCTIONED[k], `${k} is a documented, non-moral sort key`);

  // Neither of the two replacements the brief rules out may have crept in as a
  // substitute for the retired ordering.
  const hubCode = CODE("compare-hub.js");
  const sortBlock = hubCode.slice(hubCode.indexOf("if (sort === 'score-desc')"), hubCode.indexOf("if (sort === 'score-desc')") + 1400);
  ok(!/formalLean|leanPct|lean_ratio|partyLine|partyUnity/i.test(sortBlock),
    "the browse comparator ranks by a formal-lean ratio or a party metric — both are\n" +
    "    explicitly not substitutes for the retired composite");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the real comparator, run against a poisoned composite");
// ═════════════════════════════════════════════════════════════════════════════
// The strongest available statement is not "the branch is absent from the source"
// but "the shipped comparator cannot read the grade even if it wanted to". So the
// comparator is lifted verbatim out of compare-hub.js and run in a context where
// every route to the composite is a landmine: `p.accountability` throws on access,
// and any window global whose name contains "acct" throws on read.
{
  const src = CODE("compare-hub.js");
  const start = src.indexOf("if (sort === 'score-desc')");
  must(start > 0, "the browse comparator chain moved — its opening branch is gone");
  // Walk the if/else-if chain: brace depth returns to zero between branches, so
  // the chain ends at the first depth-zero close not followed by `else`.
  let depth = 0, i = start, end = -1;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const rest = src.slice(i + 1).match(/^\s*else\b/);
        if (!rest) { end = i + 1; break; }
      }
    }
  }
  must(end > start, "could not delimit the browse comparator chain");
  const BLOCK = src.slice(start, end);
  ok(BLOCK.split("if (sort ===").length - 1 >= 3,
    "the lifted comparator chain looks truncated — fewer than three sort branches");

  const trip = [];
  const boom = (what) => () => { trip.push(what); throw new Error("comparator touched " + what); };
  const mkRow = (pid, name) => {
    const o = { name: name, office: "U.S. Representative" };
    Object.defineProperty(o, "accountability", { get: boom("p.accountability of " + pid), configurable: true });
    Object.defineProperty(o, "overallScore", { get: boom("p.overallScore of " + pid), configurable: true });
    return o;
  };
  const CMP = { a: mkRow("a", "Zeta Alvarez"), b: mkRow("b", "Alpha Boone"), c: mkRow("c", "Mid Carver") };
  // Depths and matches deliberately disagree with each other AND with the names,
  // so every key produces a distinguishable order.
  const DEPTH = { a: 1, b: 9, c: 5 };
  const MATCH = { a: 88, b: 12, c: 50 };
  const winStub = new Proxy({}, {
    get(_t, k) {
      if (typeof k === "string" && /acct/i.test(k)) { trip.push("window." + k); throw new Error("comparator read window." + k); }
      return undefined;
    },
    has(_t, k) { return typeof k === "string" && !/acct/i.test(k); },
  });

  // A tripped mine is a FAILURE, not a crash: report which route the comparator
  // took and carry on, so one restored branch does not hide the rest of the file.
  const run = (sort, pids) => {
    const fn = new Function("sort", "pids", "CMP_DATA", "_waDepth", "_calcAlignmentScore", "window",
      BLOCK + "\nreturn pids;");
    try {
      return fn(sort, pids.slice(), CMP, (p) => DEPTH[p], (p) => MATCH[p], winStub);
    } catch (e) {
      failures.push(`sort '${sort}' reached the retired composite — ${e.message}`);
      return ["<threw>"];
    }
  };

  const INPUT = ["a", "b", "c"];
  eq(run("score-desc", INPUT).join(","), "b,c,a", "score-desc orders by ⚖️ Word vs Action depth, high → low");
  eq(run("score-asc", INPUT).join(","), "a,c,b", "score-asc orders by the same depth, low → high");
  eq(run("alpha", INPUT).join(","), "b,c,a", "alpha orders by name");
  eq(run("align-desc", INPUT).join(","), "a,c,b", "align-desc orders by the reader's own issue match");
  // A stale value — a bookmarked state, a hand-set select, a future typo. It must
  // fall through to the order it arrived in, never to a grade.
  eq(run("acct-desc", INPUT).join(","), "a,b,c", "a stale 'acct-desc' falls through to input order");
  eq(run("acct-asc", INPUT).join(","), "a,b,c", "a stale 'acct-asc' falls through to input order");
  eq(trip.length, 0, `the comparator reached for the composite: ${trip.join(", ")}`);

  // Stability: the default sort is a pure function of its inputs.
  eq(run("score-desc", INPUT).join(","), run("score-desc", ["c", "a", "b"]).join(","),
    "the default sort is stable — same inputs, same order, regardless of arrival order");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Direction Match does not consume the composite");
// ═════════════════════════════════════════════════════════════════════════════
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "coverage.js", "profile-spine.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, s] of SRC) vm.runInContext(s, ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}
const win = boot();
must(win.PDXWordAction && win.PDXConsistency, "the engine did not boot");

// Subjects with a real published read, plus one whose record is formal-only.
const SUBJECTS = ["trump", "bennie_thompson", "doug_mastriano"].filter((p) => win.CMP_DATA[p]);
must(SUBJECTS.length === 3, "a fixture subject left the bundled data");
{
  const snap = (pid) => {
    const r = win.PDXWordAction.read(pid, win.CMP_DATA[pid]);
    return JSON.stringify(r, (k, v) => (typeof v === "function" ? "fn" : v));
  };
  const before = {};
  for (const pid of SUBJECTS) before[pid] = snap(pid);
  ok(Object.values(before).every((s) => s && s.length > 2), "read() produced something to compare");

  // Mutation: give every profile a composite at both extremes, and take it away
  // entirely. If any tier of Direction Match consulted it, one of these moves the
  // string. (A stored snapshot could only prove the number is what it was
  // yesterday; this proves it is not a function of the grade at all.)
  const MOVES = [
    ["a maximal composite", { overallScore: 100, rating: "Highly Accountable", color: "#4ade80" }],
    ["a minimal composite", { overallScore: 0, rating: "Low Accountability", color: "#f87171" }],
    [
      "no composite at all", null],
  ];
  for (const [label, val] of MOVES) {
    for (const pid of Object.keys(win.CMP_DATA)) {
      if (val) win.CMP_DATA[pid].accountability = JSON.parse(JSON.stringify(val));
      else delete win.CMP_DATA[pid].accountability;
    }
    if (typeof win.PDXDataChanged === "function") win.PDXDataChanged();
    for (const pid of SUBJECTS) {
      eq(snap(pid), before[pid], `${pid}: Direction Match moved when the profile carried ${label}`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · formal-first surfaces are untouched, and still counts");
// ═════════════════════════════════════════════════════════════════════════════
{
  const FPI = win.PDXConsistency.formalPatternIndex;
  for (const pid of SUBJECTS) {
    const count = FPI.count(pid);
    const rows = FPI.rows(pid) || [];
    eq(rows.length, count, `${pid}: the atlas count is the atlas row count`);
    const shape = FPI.shape(pid);
    if (count > 0) {
      eq(shape && shape.issues, count, `${pid}: the shape hero counts the same issues the atlas holds`);
    }
    const chip = String(win.PDXWordAction.recordBadgeHTML(pid) || "");
    // The chip is allowed to be empty on a thin record; what it may never be is a grade.
    ok(!/\/100|Accountable|Accountability/i.test(chip),
      `${pid}: the 🏛 formal-inventory chip prints a count, not a grade`);
  }
  // The atlas markup is inventory. No composite, no band, no percentage of its own.
  const atlas = String(FPI.html("trump") || "");
  ok(atlas.length > 100, "the formal atlas still renders for a deep-record member");
  ok(!/Highly Accountable|Mostly Accountable|Low Accountability|Questionable/.test(atlas),
    "the formal atlas prints a moral band");
  ok(!/\/100/.test(atlas), "the formal atlas prints an N/100");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no band label survives on a reader-facing surface");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The engine's own ladder, verbatim from acctRating().
  const BANDS = ["Highly Accountable", "Mostly Accountable", "Low Accountability", "Questionable"];
  const ladder = CODE(OWNER);
  for (const b of BANDS) {
    ok(ladder.includes(b), `the ladder rung ${JSON.stringify(b)} still exists in the owner — this gate is\n` +
      "    hunting for a real string, not a stale one");
  }
  // Every module that can render a member row or card.
  const SURFACES = [
    "compare-hub.js", "compare-table.js", "ballot-breakdown.js", "profiles-full.js",
    "profile-card.js", "profile-spine.js", "profile-dossier.js", "your-ballot.js",
    "evidence-locker.js", "spotlight-hub.js", "issue-compare.js", "hero-showcase.js",
    "word-action.js", "my-profile.js",
  ];
  // A retirement note left in emitted markup is still a comment about the thing,
  // not the thing — so HTML comments are stripped here alongside JS ones.
  const COPY = (f) => CODE(f).replace(/<!--[\s\S]*?-->/g, "");
  for (const f of SURFACES) {
    const code = COPY(f);
    for (const b of BANDS) {
      ok(!code.includes(b), `${f} prints the retired band label ${JSON.stringify(b)} on a member surface`);
    }
    ok(!/Accountability of Truth Score/.test(code),
      `${f} still names the retired composite in rendered copy`);
  }
  const htmlCode = R("index.html").replace(/<!--[\s\S]*?-->/g, "");
  for (const b of BANDS) ok(!htmlCode.includes(b), `index.html prints the band label ${JSON.stringify(b)}`);
  ok(!/Accountability of Truth/.test(htmlCode), "index.html still names the retired composite");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · nothing this pass added publishes a percentage");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The two blocks this pass rewrote to stop reading the composite. Neither may
  // have replaced it with a figure — the brief forbids a second formal percentage
  // and any new overall "accountability %".
  const ballot = CODE("ballot-breakdown.js");
  const gate = ballot.slice(ballot.indexOf("var hasFormalRecord"), ballot.indexOf("var noObjectiveRecord") + 200);
  ok(gate.length > 100, "the Key Races record gate moved — this check cannot see it");
  ok(!/%/.test(gate), "the Key Races record gate publishes a percentage");
  ok(/coverage\.word|formalPatternIndex/.test(gate),
    "the Key Races record gate no longer asks the formal record whether anything is on file");

  const prof = CODE("profiles-full.js");
  const money = prof.slice(prof.indexOf("window._renderMandateAlignment = function"), prof.indexOf("window._ftMeta ="));
  ok(money.length > 200, "the Follow the Money block moved — this check cannot see it");
  ok(!/overallScore|accountability/i.test(money),
    "the Follow the Money block reads the accountability object again");
  ok(!/\/100/.test(money), "the Follow the Money block publishes an N/100 tile again");
  ok(!/MANDATE_OVERRIDES/.test(money), "the retired scorecard's override table is being read again");
}

console.log("");
if (failures.length) {
  console.error(`✗ acct not ranked: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ acct not ranked: the retired composite orders nobody — ${passed} assertions passed\n`);
