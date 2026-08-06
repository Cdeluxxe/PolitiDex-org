#!/usr/bin/env node
// Executive-lane measurement audit. Prints, for one figure, exactly what entered the
// Word vs Action tested set, what was held out and under which rule, every issue an
// executive action maps to, and the issue rows the profile card tallies from.
//
// Not a gate — the name is deliberately not test-*.mjs, so `npm test` does not run it.
// It answers "why is the score what it is" when the score looks wrong, which is the
// question that is otherwise very expensive to re-derive by reading three modules.
//
//   node scripts/audit-exec-wa.mjs        (PID is the constant below)
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

const CS = win.PDXConsistency, WA = win.PDXWordAction, XA = CS.execActions;
const PID = "trump", P = win.CMP_DATA[PID];

const r = WA.read(PID, P);
console.log("=== HEADLINE ===");
console.log("pct", r.pct, "token", r.token, "publishable", r.publishable);
console.log("counts", JSON.stringify(r.counts));
console.log("coverage", JSON.stringify(r.coverage));
console.log("testedWeight", r.testedWeight);

console.log("\n=== TESTED ITEMS (" + r.tested.length + ") ===");
for (const t of r.tested) {
  console.log(`  [${t.tier}] ${t.issueKey} :: ${t.test.token} score=${t.test.score} w=${t.appliedWeight} ev=${t.test.evidence}`);
  console.log(`      label: ${t.label}`);
  console.log(`      word:  ${(t.text || "").slice(0, 160)}`);
}

console.log("\n=== UNTESTED ITEMS (" + r.untested.length + ") ===");
for (const t of r.untested) {
  console.log(`  [${t.tier}] ${t.issueKey || "(no key)"} :: ${t.test.reason} (kind=${t.kind})`);
  console.log(`      label: ${t.label}`);
  console.log(`      word:  ${(t.text || "").slice(0, 140)}`);
}

console.log("\n=== ALL ISSUE KEYS WITH EXEC ACTIONS ===");
for (const k of XA.issues(PID).sort()) {
  const pool = XA.forIssue(PID, k);
  const ov = CS.officialRecord(PID, k);
  const stance = (win._polPositionMap(PID, P) || {})[k];
  console.log(`  ${k}: touched=${pool.touched} scored=${pool.items.length} held=${pool.held.map(h => h.reason + (h.why ? "/" + h.why : "") + ":" + h.documentId).join("|")}`);
  console.log(`      stance=${stance ? stance.stance : "(none)"} ov.token=${ov && ov.token} ov.score=${ov && ov.score} lane=${ov && ov.lane}`);
}

console.log("\n=== POSITION MAP (all stated stances) ===");
const pm = win._polPositionMap(PID, P) || {};
for (const k of Object.keys(pm).sort()) {
  const ov = CS.officialRecord(PID, k);
  console.log(`  ${k}: ${pm[k].stance}  ->  ov=${ov && ov.token}/${ov && ov.score} lane=${ov && ov.lane} execTouched=${ov && ov.execTouched}`);
}

console.log("\n=== STANCE LIST (raw) ===");
const list = win._resolveStanceList(PID, P) || [];
console.log("count", list.length);
for (const s of list) {
  console.log(`  ${s.issueKey} | ${s.issueStance || s.pos} | ${s.topic}`);
  console.log(`     text: ${(s.text || "").slice(0, 200)}`);
  console.log(`     src:  ${(s.source && (s.source.label || s.source.url)) || "(none)"}`);
}

console.log("\n=== promises / kept / broken on the roster record ===");
console.log("promises:", Array.isArray(P.promises) ? P.promises.length : P.promises);
if (Array.isArray(P.promises)) for (const pr of P.promises) console.log("   ", pr.verdict, "|", pr.issueKey, "|", pr.title);
console.log("kept/broken/pending:", P.kept, P.broken, P.pending);
console.log("keyIssues:", JSON.stringify(P.keyIssues || P.issues));

console.log("\n=== verdictTally (what the card prints) ===");
console.log(JSON.stringify(CS.verdictTally(PID)));
console.log("\n=== ISSUE ROWS (combined) ===");
const rows = CS.rankIssueRows(CS.issueRows(PID));
for (const row of rows) {
  console.log(`  ${row.key}: ${row.verdict.token} (${row.verdict.score}) basis=${row.verdict.basis} lane=${row.lane} tier=${row.tier} testability=${row.testability} actions=${row.evidence.actions} public=${row.evidence.public} said="${(row.stance.label||'').slice(0,40)}"`);
}
