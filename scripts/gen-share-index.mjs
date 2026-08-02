#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-share-index.mjs — the small lookup table the share-preview edge runs on
// ─────────────────────────────────────────────────────────────────────────────
// A social scraper does not run JavaScript. It fetches the URL once, reads the
// HEAD, and leaves. So the only way a shared PolitiDex link can unfurl as itself
// rather than as the generic homepage card is for the EDGE to already know what
// that URL is about — before the app boots.
//
// Everything the edge needs for a title and a one-line description is already in
// the client bundle, but it is spread across megabytes of DOM-coupled JS that no
// edge function can (or should) load. This build step distills the four small
// pieces that matter into one JSON file the edge imports at cold start:
//
//   people      — id → name / office / state / party        (from cmp-data.js)
//   spotlights  — slug → title / description / place        (from spotlights-data.js)
//   cores       — core issue key → label / blurb            (from alignment-tool.js)
//   issues      — ISSUE_MAP key → label                     (from alignment-tool.js)
//
// Nothing here is a judgment. There is deliberately no score, no verdict, no
// kept/broken tally: a preview is an ADDRESS LABEL for a page, and a cached
// verdict that has since moved is exactly the kind of thing that must never
// travel as a PNG in someone's feed. The edge card says what the page IS.
//
// Run it whenever the roster, the Spotlights, or the issue vocabulary change:
//   node scripts/gen-share-index.mjs
// Output is sorted and carries no timestamp, so re-running only changes the file
// when the underlying content actually changed.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "db", "share-index.json");

// ── Reading the plain-data bundles ───────────────────────────────────────────
// cmp-data.js and spotlights-data.js are pure `Object.assign(window.X, {…})`
// data modules — no DOM, no side effects — so they evaluate cleanly in a bare
// sandbox with nothing but a `window` object to attach to.
function loadDataGlobals(files) {
  const sandbox = { window: {}, document: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  for (const f of files) {
    const src = readFileSync(join(ROOT, f), "utf8");
    try {
      vm.runInContext(src, sandbox, { filename: f });
    } catch (err) {
      throw new Error(`Failed to evaluate ${f}: ${err.message}`);
    }
  }
  return sandbox.window;
}

// ── Reading a literal out of a DOM-coupled file ──────────────────────────────
// alignment-tool.js is a big IIFE that touches the DOM, so it cannot be run.
// Extract just the balanced literal that follows a marker, counting only the
// brackets that are part of the structure — skipping any that appear inside
// string literals or inside `//` and `/* */` comments, both of which occur
// throughout these blocks. (Same scanner shape as gen-issue-keys.mjs.)
function extractLiteral(src, markerRe, open, close, what) {
  const marker = markerRe.exec(src);
  if (!marker) throw new Error(`Could not find ${what} in alignment-tool.js`);

  let i = marker.index + marker[0].length;
  if (src[i] !== open) throw new Error(`Expected \`${open}\` after ${what}`);

  let depth = 0;
  let quote = null;
  const start = i;
  for (; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
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
    if (ch === "'" || ch === '"' || ch === "`") quote = ch;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`Unbalanced brackets while reading ${what}`);
}

function evalLiteral(literal, what) {
  try {
    return new Function(`return (${literal});`)();
  } catch (err) {
    throw new Error(`Failed to evaluate ${what}: ${err.message}`);
  }
}

// Collapse whitespace and cap a string — descriptions land in a <meta content="…">
// and on a 1200×630 card, and neither has room for an essay.
function trim(s, max) {
  const out = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  if (out.length <= max) return out;
  return out.slice(0, max - 1).replace(/[\s,;:.\-—]+$/, "") + "…";
}

// ── people ───────────────────────────────────────────────────────────────────
const globals = loadDataGlobals(["cmp-data.js", "spotlights-data.js"]);

const people = {};
const roster = globals.CMP_DATA || {};
for (const id of Object.keys(roster).sort()) {
  const p = roster[id];
  if (!p || !p.name) continue;
  const rec = { n: trim(p.name, 80) };
  if (p.office) rec.o = trim(p.office, 80);
  if (p.state) rec.s = trim(p.state, 40);
  if (p.party) rec.p = trim(p.party, 16);
  people[id] = rec;
}
if (!Object.keys(people).length) {
  throw new Error("CMP_DATA produced zero people — refusing to write an empty index");
}

// ── spotlights ───────────────────────────────────────────────────────────────
// An Issue Spotlight is a documented explainer, not a verdict on a person, so the
// index carries only its own framing: what it is called, where it applies, and
// the neutral summary the page already publishes as its meta description.
const spotlights = {};
const spots = globals.SPOTLIGHTS || {};
for (const slug of Object.keys(spots).sort()) {
  const sp = spots[slug];
  if (!sp || !sp.title) continue;
  const rec = { t: trim(sp.title, 120) };
  const desc = sp.metaDescription || sp.blurb || sp.summary || "";
  if (desc) rec.d = trim(desc, 260);
  if (sp.place) rec.pl = trim(sp.place, 60);
  if (sp.updated) rec.u = trim(sp.updated, 60);
  spotlights[slug] = rec;
}
if (!Object.keys(spotlights).length) {
  throw new Error("SPOTLIGHTS produced zero entries — refusing to write an empty index");
}

// ── issue vocabulary ─────────────────────────────────────────────────────────
const alignSrc = readFileSync(join(ROOT, "alignment-tool.js"), "utf8");

const issueMap = evalLiteral(
  extractLiteral(alignSrc, /var\s+ISSUE_MAP\s*=\s*/, "{", "}", "`var ISSUE_MAP =`"),
  "the ISSUE_MAP literal"
);
const coreList = evalLiteral(
  extractLiteral(alignSrc, /var\s+CORE_NATIONAL_ISSUES\s*=\s*/, "[", "]", "`var CORE_NATIONAL_ISSUES =`"),
  "the CORE_NATIONAL_ISSUES literal"
);

const issues = {};
for (const k of Object.keys(issueMap).sort()) {
  const label = issueMap[k] && issueMap[k].label;
  if (label) issues[k] = trim(label, 80);
}

const cores = {};
for (const c of coreList) {
  if (!c || !c.key) continue;
  cores[c.key] = { l: trim(c.label, 90) };
  if (c.blurb) cores[c.key].b = trim(c.blurb, 220);
}
if (!Object.keys(cores).length) {
  throw new Error("CORE_NATIONAL_ISSUES produced zero entries — refusing to write an empty index");
}

const payload = {
  _generatedBy:
    "scripts/gen-share-index.mjs (from cmp-data.js, spotlights-data.js, alignment-tool.js)",
  _note:
    "Read by netlify/edge-functions/share-preview.ts and share-og.ts to build per-link social previews. Titles and descriptions only — no scores, no verdicts.",
  counts: {
    people: Object.keys(people).length,
    spotlights: Object.keys(spotlights).length,
    cores: Object.keys(cores).length,
    issues: Object.keys(issues).length,
  },
  people,
  spotlights,
  cores,
  issues,
};

writeFileSync(OUT, JSON.stringify(payload) + "\n", "utf8");
console.log(
  `Wrote share index to ${OUT} — ` +
    `${payload.counts.people} people, ${payload.counts.spotlights} spotlights, ` +
    `${payload.counts.cores} core issues, ${payload.counts.issues} issue keys`
);
