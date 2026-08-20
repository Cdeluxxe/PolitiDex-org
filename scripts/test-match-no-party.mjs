#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-match-no-party.mjs — the match tool never answers with someone's party
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex measures what a person SAID against what that person DID. The moment
// any surface answers a question about an individual by reading the letter next
// to their name, the product is training party-vs-party instead — and it is the
// match tool, not the score, that was doing it.
//
// _alignApplyLean used to fill a match cell when a candidate had neither a
// documented position nor a formal-record pattern on one of the visitor's issues,
// by pulling the cell toward a party target (aligned 80 / opposed 38, blended at
// 0.22). It read as a light touch. Measured against the shipped roster it was not:
// only 6.2% of (candidate × leaning-issue) cells carried a documented position, so
// 82.6% of them were answered by party. Independents were exempt, which made the
// shape of the guess plain.
//
// The rule now, and what this file exists to keep true:
//
//   1. NO PARTY IN THE SCORE. No match-scoring path reads `d.party`, and no
//      match-scoring path reads ISSUE_MAP's `lean`.
//   2. SILENCE IS DROPPED, NOT FILLED. An issue with no documented position and
//      no record pattern leaves the weighted average untouched.
//   3. AND IT IS REPORTED. It lands in bd.uncovered and in the coverage line —
//      a smaller honest match, said out loud, not a quietly complete one.
//   4. NO REPLACEMENT PRIOR. Not the candidate's overall score, not keyword
//      overlap, not caucus or state or incumbency. Nothing.
//   5. SYMMETRY. R, D and independent candidates with the same (absent) evidence
//      get the same treatment. The old exemption for independents is gone.
//   6. THE DATA THAT STAYS, STAYS. ISSUE_MAP still carries `lean`, because
//      word-action.js reads it to keep opposed facets (gun_rights / gun_safety)
//      from collapsing into one key. It is branding data, never a score input.
//
//   node scripts/test-match-no-party.mjs

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
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "consistency.js", "voting-record.js", "word-action.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, ctx, { filename: f }); }
    catch (e) { console.error(`  ! ${f}: ${e.message}`); }
  }
  return win;
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const lacks = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the party path is gone from the source, not just unused");
// ═════════════════════════════════════════════════════════════════════════════
{
  const src = R("alignment-tool.js");
  // Strip comments before looking for code. The retirement note names the dead
  // function on purpose, and a test that cannot tell a warning from a call site
  // would force the warning to be deleted.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  lacks(code, "function _alignApplyLean", "_alignApplyLean is not defined any more");
  lacks(code, "_alignApplyLean(", "…and nothing calls it");
  has(src, "RETIRED — _alignApplyLean",
    "…and the source says why, so it is not re-added as an improvement");

  // The specific arithmetic, in case it comes back wearing a different name.
  // (0.78 and 0.22 survive as CSS lengths and rgba alphas — look for the blend,
  // not the digits.)
  ok(!/[*+]\s*0\.78\b|\b0\.78\s*[*+]/.test(code),
    "the 0.78/0.22 party blend arithmetic is gone");
  ok(!/party\s*===?\s*lean/.test(code), "…and so is the party-equals-lean comparison");
  ok(!/\.lean\b/.test(code),
    "no code path in the match tool reads ISSUE_MAP's `lean` at all");

  // d.party may still be read for identity (chips, labels) but never inside the
  // two scoring functions. Isolate them and check.
  for (const fn of ["_calcAlignmentScore", "_calcAlignmentBreakdown"]) {
    const start = code.indexOf("function " + fn + "(");
    ok(start >= 0, `${fn} is present`);
    // Cut at the next top-level function declaration.
    const rest = code.slice(start + 10);
    const end = rest.search(/\n    function [_a-zA-Z]/);
    const body = end > 0 ? rest.slice(0, end) : rest;
    lacks(body, "party", `${fn} does not mention party at all`);
    lacks(body, "lean", `${fn} does not mention lean at all`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · silence is dropped and reported, in both lanes");
// ═════════════════════════════════════════════════════════════════════════════
const probe = boot();
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const LEANED = ISSUE_KEYS.filter((k) => probe.ISSUE_MAP[k].lean);
ok(LEANED.length > 0,
  "ISSUE_MAP still carries `lean` as data — word-action.js needs it for branding");

// Someone with documented positions, so we can pick one issue they cover and one
// they do not and watch only the second one fall out.
const PID = "schumer";
const POLMAP = probe._polPositionMap(PID) || {};
const COVERED = ISSUE_KEYS.filter((k) => POLMAP[k])[0];
// A leaning issue they have NOT spoken to — exactly the cell the party blend used
// to fill, and the whole reason this file exists.
const SILENT = LEANED.filter((k) => !POLMAP[k])[0];
ok(COVERED && SILENT, "the fixture offers one covered and one silent leaning issue");

{
  const win = boot();
  win.alignToggleIssue(COVERED);
  win.alignToggleIssue(SILENT);
  const bd = win._calcAlignmentBreakdown(PID);
  ok(bd, "a candidate with one documented position still produces a match");
  eq(bd.issues.length, 1, "…built from exactly the one issue they have spoken to");
  eq(bd.issues[0].key, COVERED, "…and it is the documented one");
  eq((bd.uncovered || []).length, 1, "the silent issue is reported, not disappeared");
  eq(bd.uncovered[0].key, SILENT, "…by name");
  ok(bd.issues.every((r) => r.source === "stated" || r.source === "record"),
    "every scored row names a real lane — nothing is 'inferred'");

  // The headline and the breakdown must agree about what they left out.
  const solo = boot();
  solo.alignToggleIssue(COVERED);
  eq(win._calcAlignmentScore(PID), solo._calcAlignmentScore(PID),
    "adding an issue nobody can answer does not move the headline % by even a point");
}

{
  // Every issue silent → no number at all, rather than a party-shaped one.
  const win = boot();
  const allSilent = LEANED.filter((k) => !POLMAP[k]).slice(0, 4);
  ok(allSilent.length >= 2, "the fixture offers several silent leaning issues");
  allSilent.forEach((k) => win.alignToggleIssue(k));
  eq(win._calcAlignmentScore(PID), null,
    "with nothing documented and nothing on the record, there is NO match score");
  eq(win._calcAlignmentBreakdown(PID), null, "…and no breakdown either");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · R, D and independent are treated identically on identical silence");
// ═════════════════════════════════════════════════════════════════════════════
{
  const D = probe.CMP_DATA || {};
  const partyOf = (pid) => String((D[pid] || {}).party || "").toUpperCase().charAt(0);
  // Candidates who have said nothing on this issue, grouped by party. Under the
  // old blend an R and a D here scored 80-ish and 38-ish on the same emptiness.
  const silentOn = (letter) => Object.keys(D).filter((pid) => {
    if (partyOf(pid) !== letter) return false;
    const pm = probe._polPositionMap(pid, D[pid]) || {};
    return !pm[SILENT];
  });
  const rs = silentOn("R"), ds = silentOn("D");
  ok(rs.length && ds.length, "the roster has both R and D candidates silent on this issue");

  const win = boot();
  win.alignToggleIssue(SILENT);
  const scores = new Set();
  const sample = [...rs.slice(0, 25), ...ds.slice(0, 25)];
  for (const pid of sample) scores.add(win._calcAlignmentScore(pid));
  eq(scores.size, 1, "every silent candidate gets the same answer regardless of party");
  eq([...scores][0], null, "…and that answer is 'no match', not a number");

  // The independent exemption was the tell. There is nothing left to be exempt from.
  const inds = Object.keys(D).filter((pid) => {
    const p = partyOf(pid);
    if (p === "R" || p === "D") return false;
    const pm = probe._polPositionMap(pid, D[pid]) || {};
    return !pm[SILENT];
  });
  if (inds.length) {
    eq(win._calcAlignmentScore(inds[0]), null,
      "an independent is handled the same way, not as a special case");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the visitor is told, in words, what fell out and why");
// ═════════════════════════════════════════════════════════════════════════════
{
  const win = boot();
  win.alignToggleIssue(COVERED);
  LEANED.filter((k) => !POLMAP[k]).slice(0, 5).forEach((k) => win.alignToggleIssue(k));
  const cov = win._alignStatedCoverage(PID);
  eq(cov.covered, 1, "stated coverage counts the issues actually answered");
  eq(cov.total, 6, "…against every issue the visitor picked");
  eq(cov.missing.length, 5, "…and names the rest");
  ok(cov.missing.every((m) => m.key && m.label), "each named gap carries a human label");
  eq(cov.sparse, true, "one-of-six is flagged sparse");

  const note = win._alignCoverageNoteHtml(PID, win._calcAlignmentBreakdown(PID));
  has(note, "1 of your 6 issues", "the note states the fraction in the visitor's terms");
  has(note, "documented position", "…names what the fraction is made of");
  has(note, "Not counted", "…names the issues left out");
  has(note, "not</b> estimated from their party",
    "…and refuses the party guess in as many words");
  lacks(note, "%", "the coverage note is a count, not a second score");

  // The collapsed card must not claim more than the breakdown does.
  const bar = win._alignCardBar(PID);
  has(bar, "1 of your 6 issue", "the card sub-line carries the same fraction");
  lacks(bar, "Based on <b>your 6 selected issue",
    "…and no longer implies all six are in the number");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the walls Direction Match depends on are untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  // word-action.js reads `lean` to disambiguate which issue a bill's branding
  // points at. That is what keeps gun_rights and gun_safety from collapsing.
  // Removing the field to "finish the job" would silently change Direction Match.
  has(R("word-action.js"), "im[keys[0]].lean",
    "word-action.js still reads `lean` for branding disambiguation");
  const gr = probe.ISSUE_MAP.gun_rights, gs = probe.ISSUE_MAP.gun_safety;
  ok(gr && gs && gr.lean && gs.lean && gr.lean !== gs.lean,
    "…and the opposed gun facets still carry the opposite leans it needs");

  // Toggling issues in the match tool must not move a single Direction Match read.
  const before = boot();
  const after = boot();
  [COVERED, SILENT].forEach((k) => after.alignToggleIssue(k));
  const a = before.PDXWordAction.read(PID, before.CMP_DATA[PID]);
  const b = after.PDXWordAction.read(PID, after.CMP_DATA[PID]);
  eq(b && b.pct, a && a.pct, "Direction Match % is identical with the match tool loaded up");
  eq(b && b.token, a && a.token, "…and so is its outcome token");
}

console.log("");
if (failures.length) {
  console.error(`✗ match / no party: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ match / no party: the match tool never fills a gap with party — ${passed} assertions passed\n`);
