#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-crawl-body-seam.mjs — the crawl header lands on the REAL opening body tag
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG THIS EXISTS TO PREVENT, STATED AS THE SYMPTOM IT SHIPPED WITH
//
// /p/trump showed a block of raw CSS under "Open the full file": the tail of a
// stylesheet comment and a `body { padding-top: … }` rule, printed as text.
// netlify/edge-functions/share-preview.ts inserts the crawl header after the
// FIRST match of its opening-body-tag pattern. person.html's <head> carried a CSS
// comment that spelled that tag out literally, so the match was the comment, not
// the element. The header was written inside the <style>, its own </style>
// closed the element early, and everything left of the comment rendered as
// body text.
//
// The contract: in every shell the edge injects into, the first match of the
// edge function's own pattern is the real <body> element — after </head>, and
// outside any comment. The pattern is read from share-preview.ts rather than
// copied, so a change to the injection is checked against the same rule.
//
//   node scripts/test-crawl-body-seam.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.error(`  ✗ ${msg}`); }
};

const edge = read("netlify/edge-functions/share-preview.ts");
const fn = edge.match(/function injectAfterBody\([\s\S]*?\n\}/);
ok(!!fn, "share-preview.ts still defines injectAfterBody");
const lit = fn && fn[0].match(/html\.replace\(\/(.+?)\/([a-z]*),/);
ok(!!lit, "injectAfterBody's body-tag pattern is readable");
const pattern = lit ? new RegExp(lit[1], lit[2]) : /<body[^>]*>/i;

// Shells the edge function serves /p/*, /b/* and the generic person seam from.
for (const shell of ["person.html", "index.html", "bill.html"]) {
  console.log(`\n${shell}`);
  const html = read(shell);
  const m = pattern.exec(html);
  ok(!!m, "has an opening body tag the injection can find");
  if (!m) continue;
  const at = m.index;
  const headEnd = html.search(/<\/head\s*>/i);
  ok(headEnd !== -1 && at > headEnd, "the first match sits after </head>, not in the head");
  const before = html.slice(0, at);
  ok(before.lastIndexOf("<!--") <= before.lastIndexOf("-->"), "the first match is not inside an HTML comment");
  ok(before.lastIndexOf("/*") <= before.lastIndexOf("*/"), "the first match is not inside a CSS/JS comment");

  // Simulate the injection with a marker block and confirm nothing from the
  // stylesheet follows it as text before the next tag.
  const MARK = '<header id="pdx-crawl-person"><p>marker</p></header>';
  const out = html.replace(pattern, (t) => t + MARK);
  const after = out.slice(out.indexOf(MARK) + MARK.length);
  const textRun = after.slice(0, after.search(/</)).trim();
  ok(!/[{}]|\*\//.test(textRun), "no CSS or comment text follows the injected header");
}

if (failures) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nall crawl body-seam assertions passed");
