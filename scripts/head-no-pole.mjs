// ─────────────────────────────────────────────────────────────────────────────
// head-no-pole.mjs — HEAD's stance-helpers.js, told about subject keys it predates
// ─────────────────────────────────────────────────────────────────────────────
// The twin-boot guards (HEAD's engine and the working tree's, one corpus) build
// that corpus from the WORKING seed. When a pass adds a subject key to the seed
// and to _RD_NO_POLE together — ukraine_policy and yemen_policy did — HEAD's
// engine meets rows for a key it never declared and reads a direction the key
// does not have, so every file with such a row "drifts" though no code moved.
//   This hands HEAD's stance-helpers.js the no-pole entries the working tree
// declares and HEAD lacks, and nothing else, so the guard is back to measuring
// code drift. Once the pass is committed HEAD already carries the entries and
// this is a no-op.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RE = /var _RD_NO_POLE = \{([\s\S]*?)\n    \};/;
const keysIn = (src) => {
  const m = RE.exec(String(src || ""));
  return m ? [...m[1].matchAll(/^\s*([a-z_]+):\s*1/gm)].map((x) => x[1]) : [];
};

export function withDeclaredNoPole(f, src) {
  if (f !== "stance-helpers.js" || typeof src !== "string" || !RE.test(src)) return src;
  const have = new Set(keysIn(src));
  const add = keysIn(readFileSync(join(ROOT, f), "utf8")).filter((k) => !have.has(k));
  if (!add.length) return src;
  return src.replace("var _RD_NO_POLE = {", "var _RD_NO_POLE = {\n      " + add.map((k) => k + ": 1,").join(" "));
}
