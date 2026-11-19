// ─────────────────────────────────────────────────────────────────────────────
// coverage-core.mjs — shared pieces of the Phase 5 coverage generators
// ─────────────────────────────────────────────────────────────────────────────
// gen-committees.mjs, gen-cosponsorships.mjs and gen-funding.mjs all turn an
// official per-member record (keyed by the member's bioguide id) into a table
// keyed by PolitiDex roster id. The bridge is the same one the Voting Record
// ingest and the bill pages use: db/vr-member-map.json (bioguide → roster id),
// kept only where the roster id is a cmp-data.js record. No name matching, no
// guessing — a member the map does not carry is left out.
//
// Also: a deterministic JSON writer and a check/write helper, so every one of
// these generators has the same --check behaviour (exit 1 when stale).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const readText = (f, root = ROOT) => readFileSync(join(root, f), "utf8");
export const readJson = (f, root = ROOT) => JSON.parse(readText(f, root));

// The roster: every cmp-data.js record id.
export function rosterIds(root = ROOT) {
  const w = {}; w.window = w;
  vm.runInNewContext(readText("cmp-data.js", root), w, { filename: "cmp-data.js" });
  return new Set(Object.keys(w.CMP_DATA || {}));
}

// bioguide → roster id, roster ids only.
export function bioguideMap(root = ROOT, roster = rosterIds(root)) {
  const map = readJson("db/vr-member-map.json", root).map || {};
  const out = new Map();
  for (const [bg, pid] of Object.entries(map)) {
    if (/^[A-Z]\d{6}$/.test(bg) && roster.has(pid)) out.set(bg, pid);
  }
  return out;
}

// Stable object key order, so a regenerated file only differs where data did.
export function sortKeys(o) {
  if (Array.isArray(o)) return o.map(sortKeys);
  if (!o || typeof o !== "object") return o;
  const out = {};
  for (const k of Object.keys(o).sort()) out[k] = sortKeys(o[k]);
  return out;
}

// Write `text` to `file`, or under --check report whether it would change.
// Returns true when the file is (or now is) current.
export function writeOrCheck(file, text, { check, root = ROOT, label = file } = {}) {
  const p = join(root, file);
  const prev = existsSync(p) ? readFileSync(p, "utf8") : null;
  if (check) {
    if (prev !== text) { console.error(`${label} is stale`); return false; }
    return true;
  }
  if (prev !== text) { writeFileSync(p, text); console.error(`${label} written`); }
  return true;
}

// Minimal, dependency-free XML helpers for the two official files these
// generators read. Both are flat, machine-written documents; this reads
// attributes and element text and nothing more.
export const xmlText = (s) => String(s == null ? "" : s)
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();
export function xmlAttrs(tag) {
  const out = {};
  for (const m of String(tag).matchAll(/([A-Za-z_][\w:-]*)="([^"]*)"/g)) out[m[1]] = xmlText(m[2]);
  return out;
}
export function xmlChild(block, name) {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(String(block));
  return m ? xmlText(m[1]) : "";
}
export function xmlBlocks(src, name) {
  return [...String(src).matchAll(new RegExp(`<${name}(\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "g"))]
    .map((m) => ({ attrs: xmlAttrs(m[1] || ""), body: m[2] }));
}
