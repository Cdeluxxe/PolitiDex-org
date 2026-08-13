#!/usr/bin/env node
// Term-scope probe. Prints, per issue, the executive lane's Axis A read at BOTH term
// scopes, so the difference the term filter now makes is a number rather than a claim.
//
// Not a gate — the name is deliberately not test-*.mjs.
//
//   node scripts/audit-exec-terms.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "consistency.js", "word-action.js",
];
const win = makeSandbox();
const sandbox = vm.createContext(win);
for (const f of FILES) vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });

const EX = win.PDXExecRecord, PID = "trump";
const CUR = { }, ALL = { allTerms: true };

const pCur = EX.actionsFor(PID, CUR), pAll = EX.actionsFor(PID, ALL);
console.log("=== SCOPE SIZES ===");
console.log("current term (" + EX.currentTerm(PID) + "):", pCur.kept.length, "kept");
console.log("all terms:", pAll.kept.length, "kept");
console.log("prior-term rows reachable only in the wider scope:", pAll.kept.length - pCur.kept.length);

const sCur = EX.summary(PID, CUR), sAll = EX.summary(PID, ALL);
console.log("\n=== AXIS B (standings) ===");
for (const k of Object.keys(sAll.actions)) {
  if (k === "total") continue;
  if (!sCur.actions[k] && !sAll.actions[k]) continue;
  console.log(`  ${k}: current=${sCur.actions[k] || 0} all=${sAll.actions[k] || 0}`);
}
console.log(`  total: current=${sCur.actions.total} all=${sAll.actions.total}`);
console.log("contested: current=" + sCur.contested + " all=" + sAll.contested);

console.log("\n=== AXIS A per issue, both scopes ===");
const keys = new Set();
for (const p of [pCur, pAll]) for (const a of p.kept) for (const m of a.issues || []) keys.add(m.issueKey);
const rows = [];
for (const k of [...keys].sort()) {
  const c = EX.issue(PID, k, CUR), a = EX.issue(PID, k, ALL);
  rows.push({ k, cTok: c.token, aTok: a.token, cN: c.actions.length, aN: a.actions.length });
}
for (const r of rows) {
  const moved = r.cTok !== r.aTok ? "   <<< READS DIFFERENTLY ACROSS SCOPES" : "";
  console.log(`  ${r.k}: current=${r.cTok}(${r.cN}) all=${r.aTok}(${r.aN})${moved}`);
}

console.log("\n=== DIRECTION COUNTS on issues the prior term touches ===");
console.log("(the ACT's direction, read through EX.issueDirection — a veto's mapping");
console.log(" describes the resolution it blocked and is inverted before it is counted)");
const priorKeys = new Set();
for (const a of pAll.kept) {
  if (String(a.term) === EX.currentTerm(PID)) continue;
  for (const m of a.issues || []) priorKeys.add(m.issueKey);
}
for (const k of [...priorKeys].sort()) {
  const count = (pool) => {
    let adv = 0, opp = 0;
    for (const a of pool.kept) for (const m of a.issues || []) {
      if (m.issueKey !== k) continue;
      const d = EX.issueDirection(a, m);
      if (d === "advances") adv++; else if (d === "opposes") opp++;
    }
    return adv + "a/" + opp + "o";
  };
  console.log(`  ${k}: current ${count(pCur)} → all ${count(pAll)}`);
}

console.log("\n=== WHAT THE PROFILE ACTUALLY PUBLISHES ===");
console.log("consistency.js reads the exec lane through PDXExecRecord.actionsFor(pid)");
console.log("with no options, which is the CURRENT-TERM scope. The prior-term rows are");
console.log("on file and reachable, and they do not enter the published percentage.");
console.log("tip: " + EX.summaryTip(sCur).slice(0, 400));
