#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-accountability-retired.mjs — the second score does not come back
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex once shipped an Accountability Score: a composite 0–100 assembled
// from five weighted sub-scores, a five-band moral vocabulary ("Highly
// Accountable" … "Low Accountability"), a curated per-politician override map
// that hard-coded numbers for the two flagship profiles, an inline score card, a
// browse-card badge, and a full-screen analysis overlay three buttons could open.
//
// It is retired — not hidden, not dark-launched, not returning ''. The engine
// file is deleted from the repo and therefore from the publish set; the overlay
// markup is deleted from index.html; the curated map, the weights and the rating
// ladder are gone. What survived the split is the EVIDENCE layer (spotlight rows,
// theme banners, pattern tags, the full-card renderer) which now lives in
// profile-evidence.js and states plainly that it counts items rather than
// grading a person.
//
// A retirement that is only a flag someone can flip is not a retirement. This
// suite is the wall:
//
//   1. THE ENGINE IS GONE. No accountability-score.js in the repo/publish set,
//      and nothing loads it.
//   2. THE MODEL IS GONE. No weights table, no CURATED override map, no
//      version stamp, no band-name ladder in any shipped code.
//   3. THE VOCABULARY IS GONE. No reader ever sees "Accountability Score of
//      N/100" or a moral band name.
//   4. THE DOORS ARE GONE. No opener, no toggle, no badge/card renderer, and no
//      #accountability-overlay element to open.
//   5. THE EVIDENCE SURVIVED. profile-evidence.js still ships the spotlight
//      layer, is still loaded by index.html, and says out loud that it is not a
//      grade — this pass removed a score, not the material underneath it.
//
//   node scripts/test-accountability-retired.mjs

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// Comments are where a retirement explains itself, and every file this pass
// touched carries a note saying what used to be there and why it is not coming
// back. A scan that could not tell a warning from a call site would force those
// notes to be deleted, which is the opposite of what keeps this closed.
// (HTML comments count too: these modules build markup in template literals and
// leave <!-- … --> notes inside it explaining what used to render at that spot.)
const STRIP = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/<!--[\s\S]*?-->/g, "");
const CODE = (f) => STRIP(R(f));
const HTML = () => R("index.html").replace(/<!--[\s\S]*?-->/g, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

// Every shipped browser module. There is no owner to exempt any more: the file
// that used to be allowed to contain all of this no longer exists.
const SHIPPED = readdirSync(ROOT)
  .filter((f) => f.endsWith(".js"))
  .filter((f) => !f.startsWith("sw") && !f.includes(".min."));
ok(SHIPPED.length > 40, `the sweep sees the shipped module set (${SHIPPED.length} files)`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the engine is gone from the repo and the publish set");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(!existsSync(join(ROOT, "accountability-score.js")),
    "accountability-score.js is deleted — a retired module that still deploys is still shipped weight");
  const html = R("index.html");
  ok(!/<script[^>]+accountability-score\.js/.test(html),
    "index.html loads no accountability-score.js");
  for (const f of SHIPPED) {
    ok(!/["'\/]accountability-score\.js/.test(CODE(f)),
      `${f} does not inject or import accountability-score.js`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the model — weights, curated overrides, version stamp — is gone");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The composite's machinery. Any one of these reappearing means the 0–100 is
  // being computed again, whatever it is called that time.
  const MODEL = [
    "ACCT_VERSION",
    "ACCT_WEIGHTS",
    "acctRating",
    "acctLevelColor",
    "saveAccountability",
    "_pdxScoreExplainable",
    "computeAccountability",
    "accountabilityScore",
  ];
  for (const sym of MODEL) {
    const hits = SHIPPED.filter((f) => CODE(f).includes(sym));
    eq(hits.length, 0, `no shipped module defines or calls ${sym} — found in ${hits.join(", ")}`);
    ok(!HTML().includes(sym), `index.html does not reference ${sym}`);
  }

  // The curated override map: hand-set 0–100s for the flagship profiles, keyed by
  // the five sub-scores. Its shape is the fingerprint — a category bag whose keys
  // are the retired weights — so match on that rather than on the word CURATED,
  // which a rename would slip past.
  const SUBSCORES = /promise\s*:\s*\d+[\s\S]{0,120}?voting\s*:\s*\d+[\s\S]{0,120}?rhetoric\s*:\s*\d+/;
  for (const f of SHIPPED) {
    ok(!SUBSCORES.test(CODE(f)),
      `${f} carries no curated promise/voting/rhetoric sub-score map`);
  }
  const overall = SHIPPED.filter((f) => /overall\s*:\s*\d{1,3}\s*,[\s\S]{0,80}categories\s*:/.test(CODE(f)));
  eq(overall.length, 0, `no module hard-codes an {overall, categories} score record — found in ${overall.join(", ")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the rating vocabulary is not printed to a reader");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The five bands, and the sentence form that printed the composite. These are
  // moral labels attached to a person by an arithmetic nobody can audit, which is
  // the whole reason the model was retired.
  const BANDS = [
    "Highly Accountable",
    "Mostly Accountable",
    "Questionable Accountability",
    "Low Accountability",
    "Accountability Score of",
    "Accountability Score:",
    "Accountability Analysis",
    "ACCOUNTABILITY ANALYSIS",
  ];
  for (const phrase of BANDS) {
    const hits = SHIPPED.filter((f) => CODE(f).includes(phrase));
    eq(hits.length, 0, `no module prints ${JSON.stringify(phrase)} — found in ${hits.join(", ")}`);
    ok(!HTML().includes(phrase), `index.html does not print ${JSON.stringify(phrase)}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · every door is gone, including the overlay behind them");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The openers, the card expander, and the renderers whose markup carried the
  // onclick handlers that reopened it.
  const DOORS = [
    "viewAccountabilityAnalysis",
    "openAccountabilityAnalysis",
    "showAccountabilityAnalysis",
    "closeAccountabilityModal",
    "toggleCardAccountability",
    "renderAccountabilityPanel",
    "_renderAccountabilityCard",
    "_refreshAccountabilityCard",
    "_acctCardBadge",
    "_acctCardCondensed",
    "acctAnalysisOpen",
  ];
  for (const door of DOORS) {
    const hits = SHIPPED.filter((f) => CODE(f).includes(door));
    eq(hits.length, 0, `nothing calls ${door} — found in ${hits.join(", ")}`);
    ok(!HTML().includes(door), `index.html does not wire up ${door}`);
  }

  // The overlay element itself. It is deleted, not display:none — a hidden
  // overlay is a door someone re-opens as a fix.
  const html = HTML();
  ok(!/id\s*=\s*["']accountability-overlay["']/.test(html),
    "index.html has no #accountability-overlay element");
  for (const id of ["acct-subtitle", "acct-loading", "acct-content", "acct-panel-body"]) {
    ok(!new RegExp(`id\\s*=\\s*["']${id}["']`).test(html), `index.html has no #${id}`);
  }
  // Nor may any module rebuild it at runtime.
  for (const f of SHIPPED) {
    ok(!/id\s*=\s*.?accountability-overlay/.test(CODE(f)),
      `${f} does not construct an #accountability-overlay`);
    ok(!/getElementById\(\s*['"]accountability-overlay/.test(CODE(f)),
      `${f} does not reach for #accountability-overlay`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the evidence layer survived the retirement");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Deleting a score must not delete the sourced material underneath it. The
  // spotlight layer moved to profile-evidence.js at the same load position, and
  // the modules that consumed its helpers still find them.
  ok(existsSync(join(ROOT, "profile-evidence.js")), "profile-evidence.js ships the surviving evidence layer");
  const ev = R("profile-evidence.js");
  has(R("index.html"), 'src="/profile-evidence.js"', "index.html loads profile-evidence.js");
  for (const fn of ["_slRenderFullCard", "_slEvidenceRow", "_slFocusSpotlight", "_slPatternBar", "ACCT_SPOTLIGHT"]) {
    has(ev, fn, `profile-evidence.js still exports ${fn}`);
  }
  // …and it says out loud what it is, so the tags are not read as a grade.
  ok(/not a grade/i.test(ev), "profile-evidence.js tells the reader its items are not a grade");
  has(ev, "test-accountability-retired", "…and points at this file as the thing that keeps the score out");

  // Consumers of the moved helpers are still satisfied.
  for (const f of ["profiles-full.js", "compare-hub.js"]) {
    ok(/_sl(RenderFullCard|FocusSpotlight|DriverHeader|EvidenceRow|ThemeBanner|PatternBar|ComputeDrivers)/.test(CODE(f)),
      `${f} still renders the spotlight evidence it always did`);
  }
}

console.log("");
if (failures.length) {
  console.error(`✗ accountability retired: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ accountability retired: the composite score is deleted, not hidden — ${passed} assertions passed\n`);
