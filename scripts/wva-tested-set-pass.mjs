// wva-tested-set-pass.mjs — the declared "one tested set" pass, for twin boots.
// ─────────────────────────────────────────────────────────────────────────────
// Word vs Action's read now scores exactly the issues its ⚖️ section shows (a
// stated position with a formal-record Direction Match verdict on the issue row),
// so the percentage, the tested count and the eligible count all MOVE against a
// HEAD that still scored the statement ledger. That is the pass, not a drift.
//
// Twin boots that hold PDXWordAction's read byte-identical to HEAD ask this before
// comparing it: true only while HEAD's word-action.js predates the pass and the
// working tree carries it. Once the pass is in HEAD this answers false and every
// twin holds the read byte-identical again, exactly as before. Nothing else a twin
// compares (PDXConsistency's scoped overall, the formal pattern index) is exempt.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const MARK = "function sectionIssueSet(";
let memo;
export function testedSetPassAtHead() {
  if (memo !== undefined) return memo;
  const root = new URL("..", import.meta.url).pathname;
  let head = null;
  try {
    head = execFileSync("git", ["show", "HEAD:word-action.js"],
      { cwd: root, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  } catch { head = null; }
  const now = readFileSync(root + "word-action.js", "utf8");
  memo = head != null && head.indexOf(MARK) < 0 && now.indexOf(MARK) >= 0;
  return memo;
}
