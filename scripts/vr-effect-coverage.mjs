// ─────────────────────────────────────────────────────────────────────────────
// vr-effect-coverage.mjs — the lines the v388 coverage pass wrote
// ─────────────────────────────────────────────────────────────────────────────
// Earlier passes recorded some pairs blank because the stored summary or title
// said too little. The coverage pass (EFFECT COVERAGE SLICE 17, v388) read the
// bill itself — the Legislature's Highlighted Provisions for a Utah act, the
// enrolled or House-passed text for a federal one — and where that text
// supports a line, the line supersedes the earlier blank. An earlier suite that
// holds such a blank asks here whether the coverage ledger wrote that pair, and
// then requires exactly the ledger's line instead of silence.
// scripts/test-effect-coverage-lines.mjs holds the lines themselves.
//
//   import { coverageLine } from "./vr-effect-coverage.mjs";
//   coverageLine("H.R. 815", "118", "israel_support")   // the line, or ""
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROWS = JSON.parse(readFileSync(join(ROOT, "db/vr-effect-coverage-lines.json"), "utf8")).rows;
export const COVERAGE_LINES = new Map(ROWS.filter((r) => r.decision === "line").map((r) => [r.key, r.line]));

// By number, sitting (a congress or a Utah session) and issue.
export function coverageLine(number, sitting, issue) {
  return COVERAGE_LINES.get(`${String(number).trim()}|${sitting}|${issue}`) || "";
}
