// ─────────────────────────────────────────────────────────────────────────────
// portrait-table.mjs — the bundled portraits, in the shape the census suites read
// ─────────────────────────────────────────────────────────────────────────────
// Before the one-portrait pass (v294) every bundled face was a line in the
// `var BROWSE_PHOTOS = {` literal, and the federal roster and wave suites read a
// member's portrait by slicing that literal out of browse-photos.js. A face now
// lives on the roster row's `photo` field (cmp-data.js), and the map keeps only
// people with no row. portraitSource() renders BOTH as one literal in the old
// shape — roster rows first, then the map — so those suites keep asking "does
// this member have a bundled portrait on an allowed host" of the real data,
// wherever it is filed. It reads; it writes nothing.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

export function bundledPortraits() {
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx;
  const sb = vm.createContext(ctx);
  vm.runInContext(R("cmp-data.js"), sb, { filename: "cmp-data.js" });
  vm.runInContext(R("browse-photos.js"), sb, { filename: "browse-photos.js" });
  const out = {};
  const D = ctx.CMP_DATA || {};
  for (const pid of Object.keys(D)) if (D[pid] && D[pid].photo) out[pid] = String(D[pid].photo);
  const BP = ctx.BROWSE_PHOTOS || {};
  for (const k of Object.keys(BP)) if (!(k in out)) out[k] = String(BP[k]);
  return out;
}

export function portraitSource() {
  const P = bundledPortraits();
  return "    var BROWSE_PHOTOS = {\n" +
    Object.keys(P).map((k) => `      ${k}: '${P[k].replace(/'/g, "%27")}',`).join("\n") +
    "\n    };\n";
}
