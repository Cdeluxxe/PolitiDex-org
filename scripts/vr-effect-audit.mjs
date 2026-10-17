// ─────────────────────────────────────────────────────────────────────────────
// vr-effect-audit.mjs — the file as it stood before the provisions audit
// ─────────────────────────────────────────────────────────────────────────────
// Every effect-line suite before v387 pins the lines HEAD shipped and the
// drawers HEAD rendered: a line may not change after a reader has seen it. The
// one sanctioned exception is a line its bill's own text does not support,
// rewritten in place by the provisions audit and recorded in
// db/vr-effect-line-audit.json with the shipped line (`was`), its replacement
// (`line`) and the bill's words behind it.
//
// preAudit(src) puts those nine lines back and takes the audit's two comments
// out, so an earlier suite keeps judging the world it was written for — its own
// slice's lines, its sha pins, its HEAD renders — on both sides of the
// comparison. scripts/test-effect-line-audit.mjs holds the other half: that
// preAudit(consistency.js) is HEAD's pre-audit file byte for byte, and that the
// rendered drawers differ only in the nine audited rows. A change anywhere else
// survives preAudit and still fails the earlier suites.
//
//   import { preAudit } from "./vr-effect-audit.mjs";
//   const SRC = preAudit(R("consistency.js"));
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROWS = JSON.parse(readFileSync(join(ROOT, "db/vr-effect-line-audit.json"), "utf8")).rows;
export const AUDITED = ROWS.filter((r) => r.decision === "rewritten");

const NOTE = /\n  \/\/\n  \/\/ A LINE THE BILL DOES NOT SUPPORT IS REWRITTEN IN PLACE\.[\s\S]*?(?=\n  var _DOS_EFFECT = \{)/;
const S16_NOW = "    // stay silent. S.B. 118 (2023GS) and H.B. 11 (2024GS) were written from their\n" +
  "    // titles in v385 and rewritten from their provisions in v387. The sitting is\n" +
  "    // the Utah session.";
const S16_WAS = "    // stay silent. S.B. 118 (2023GS) and H.B. 11 (2024GS) keep the lines v385\n" +
  "    // shipped from their titles, byte for byte. The sitting is the Utah session.";

export function preAudit(src) {
  let s = String(src == null ? "" : src);
  if (!s) return s;
  for (const r of AUDITED) s = s.split(`    '${r.key}':\n      '${r.line}',`).join(`    '${r.key}':\n      '${r.was}',`);
  return s.replace(NOTE, "").replace(S16_NOW, S16_WAS);
}
