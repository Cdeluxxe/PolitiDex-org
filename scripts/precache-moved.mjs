// ─────────────────────────────────────────────────────────────────────────────
// precache-moved.mjs — is a bump of the service worker owed right now?
// ─────────────────────────────────────────────────────────────────────────────
// A suite written during a pass used to assert "CACHE_VERSION moved past
// HEAD's". That is true only while the pass is uncommitted: once it lands,
// HEAD holds the bump and the check fails on a clean tree. What stays true is
// the reason for the bump: a precached shell file that differs from HEAD must
// ship under a new version, or a warm device keeps serving the old one.
//
// precachedMoved() → the precached files (from sw.js's precache list) whose
// working copy differs from HEAD, '/' read as index.html. A suite asserts the
// bump only when this is non-empty, and that the version never falls below
// HEAD's.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const headOf = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch (e) { return null; }
};
export const versionOf = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1] || 0);
export function precachedMoved() {
  const sw = readFileSync(join(ROOT, "sw.js"), "utf8");
  const files = [...new Set((sw.match(/^  '\/[^']*',$/gm) || []).map((l) => l.trim().slice(2, -2)))]
    .map((p) => (p === "" ? "index.html" : p))
    .filter((f) => !/[*?]/.test(f) && existsSync(join(ROOT, f)));
  return files.filter((f) => readFileSync(join(ROOT, f), "utf8") !== headOf(f));
}
export const headVersion = () => versionOf(headOf("sw.js"));
