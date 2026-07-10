// ─────────────────────────────────────────────────────────────────────────────
// gen-issue-keys.mjs — derive the canonical ISSUE_MAP key allow-list for the server
// ─────────────────────────────────────────────────────────────────────────────
// The Voting Record API (netlify/functions/voting-record.mts) validates every
// incoming/outgoing `issueKey` against the SAME issue vocabulary the client uses,
// so a vote can never be keyed to an issue that doesn't exist in the app. That
// vocabulary lives in the client bundle as `ISSUE_MAP` (alignment-tool.js), which
// is a big DOM-coupled IIFE the server can't just import.
//
// This build step reads alignment-tool.js, extracts ONLY the `var ISSUE_MAP = {…}`
// object literal (a self-contained block of plain string/array data — no function
// calls, no globals), evaluates it in isolation, and writes the sorted list of
// keys to db/issue-keys.json. The Function then loads that small JSON at cold start.
//
// Run it whenever ISSUE_MAP changes:  node scripts/gen-issue-keys.mjs
// It is deterministic (sorted output, no timestamp) so re-running only changes the
// file when the issue vocabulary actually changed.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "alignment-tool.js");
const OUT = join(ROOT, "db", "issue-keys.json");

// Extract the balanced `{ … }` object literal that follows `var ISSUE_MAP =`.
// A hand-rolled scanner is used (rather than a regex) so it correctly counts only
// the braces that are part of the object's structure — it skips over braces (and
// apostrophes) that appear inside string literals OR inside `//` and `/* */`
// comments, both of which occur throughout the ISSUE_MAP block.
function extractIssueMapLiteral(src) {
  const marker = /var\s+ISSUE_MAP\s*=\s*/.exec(src);
  if (!marker) throw new Error("Could not find `var ISSUE_MAP =` in alignment-tool.js");

  let i = marker.index + marker[0].length;
  if (src[i] !== "{") throw new Error("Expected `{` after `var ISSUE_MAP =`");

  let depth = 0;
  let quote = null; // ', ", or ` when inside a string literal
  const start = i;
  for (; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (quote) {
      if (ch === "\\") i++; // skip the escaped char
      else if (ch === quote) quote = null;
      continue;
    }
    // Comments — skip to their end so their contents never affect brace/quote state.
    if (ch === "/" && next === "/") {
      i = src.indexOf("\n", i);
      if (i === -1) break;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end === -1) break;
      i = end + 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error("Unbalanced braces while reading the ISSUE_MAP literal");
}

const src = readFileSync(SRC, "utf8");
const literal = extractIssueMapLiteral(src);

// The literal is pure data; evaluate it in a bare function scope (no `window`, no
// DOM) to turn it into a real object. Anything other than plain data would throw.
let issueMap;
try {
  issueMap = new Function(`return (${literal});`)();
} catch (err) {
  throw new Error("Failed to evaluate the ISSUE_MAP literal: " + err.message);
}

const keys = Object.keys(issueMap);
if (!keys.length) throw new Error("ISSUE_MAP evaluated to zero keys — refusing to write an empty allow-list");
keys.sort();

// Also emit each issue's keywords (when present). The read path only consumes
// `keys`, but the Phase-7 ingest's OPTIONAL keyword classifier (off by default)
// uses this map to suggest an issue from a bill title. Additive + backward-compatible.
const keywords = {};
for (const k of keys) {
  const kw = issueMap[k] && Array.isArray(issueMap[k].keywords) ? issueMap[k].keywords : [];
  if (kw.length) keywords[k] = kw.slice();
}

const payload = {
  // A short note so anyone opening the JSON knows it is generated, not hand-edited.
  _generatedBy: "scripts/gen-issue-keys.mjs (from ISSUE_MAP in alignment-tool.js)",
  count: keys.length,
  keys,
  keywords,
};

writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`Wrote ${keys.length} issue keys to ${OUT}`);
