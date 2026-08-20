#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-no-second-score.mjs — one headline metric, and only one
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex has exactly one sanctioned headline number: Direction Match, formal
// lane, on the profile spine. The Accountability Score — a composite 0–100 built
// from different inputs, with a different ladder, saying a different thing about
// the same person — was retired because two numbers about one politician is not
// twice the information, it is a credibility problem the reader has to arbitrate.
//
// The badge was retired first. The overlay outlived it: three buttons still
// opened the full analysis, so the composite was one tap from the compare hub
// and from every profile. Those doors are gone.
//
// The module stays in the repo (same retirement pattern as the badge — its
// evidence gathering may later attach under an existing profile stage). What must
// stay true is that no reader-facing surface can reach it:
//
//   1. NO DOORS. Nothing outside accountability-score.js opens the analysis.
//   2. THE RETIRED RENDERERS RENDER NOTHING. The card and badge return '' before
//      they can emit the markup whose own onclick handlers would reopen it.
//   3. NO COMPOSITE IN THE COPY. "Accountability Score of N/100" is not printed
//      anywhere a reader can see.
//   4. THE SPINE IS UNCHANGED. Direction Match is still the one headline, and
//      the driver panel that used to carry a door still carries its evidence.
//
//   node scripts/test-no-second-score.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// Comments are where a retirement explains itself. A scan that cannot tell a
// warning from a call site would force the warnings to be deleted, which is the
// opposite of what keeps this closed.
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const OWNER = "accountability-score.js";
// Every shipped browser module, minus the one that owns the retired overlay.
const SHIPPED = readdirSync(ROOT)
  .filter((f) => f.endsWith(".js") && f !== OWNER)
  .filter((f) => !f.startsWith("sw") && !f.includes(".min."));
ok(SHIPPED.length > 40, `the sweep sees the shipped module set (${SHIPPED.length} files)`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · no module outside the owner opens the analysis");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The openers, and the expander that lazily rendered the composite inline.
  const DOORS = [
    "viewAccountabilityAnalysis",
    "openAccountabilityAnalysis",
    "showAccountabilityAnalysis",
    "toggleCardAccountability",
    "acctAnalysisOpen",
  ];
  for (const door of DOORS) {
    const hits = SHIPPED.filter((f) => CODE(f).includes(door));
    eq(hits.length, 0, `no module calls ${door} — found in ${hits.join(", ")}`);
  }

  // index.html ships ~84 script tags and its own inline handlers; it is a
  // reader-facing surface too.
  const html = R("index.html");
  for (const door of DOORS) {
    ok(!html.includes(door), `index.html does not wire up ${door}`);
  }

  // #accountability-overlay itself is allowed to be referenced — several modules
  // list it among the overlays they DISMISS when opening their own. Closing a
  // thing is not a door into it. What must not exist is anything that shows it.
  // Deliberately spans lines: the real opener in accountability-score.js gets the
  // element on one line and sets display on the next. Self-checked below against
  // that opener, so this cannot rot into a regex that matches nothing.
  const OPENERS = /accountability-overlay['"][\s\S]{0,200}?(display\s*:\s*flex|classList\.(?:add|remove)|style\.display\s*=\s*['"](?!none))/;
  ok(OPENERS.test(CODE(OWNER)),
    "the opener pattern still matches the real show-overlay code it is hunting for");
  ok(!OPENERS.test(CODE("ballot-breakdown.js")),
    "…and does not fire on a module that only lists the overlay to dismiss it");
  for (const f of SHIPPED) {
    ok(!OPENERS.test(CODE(f)), `${f} references #accountability-overlay only to dismiss it`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the specific buttons this pass removed are gone");
// ═════════════════════════════════════════════════════════════════════════════
{
  const hub = CODE("compare-hub.js");
  ok(!/View full accountability analysis/i.test(hub),
    "compare-hub: both 'View full accountability analysis →' buttons are gone");
  ok(!/View Accountability Analysis/i.test(hub),
    "compare-hub: the browse-card expander into the composite is gone");
  ok(!/acctexp-|acctbtn-|acctchev-/.test(hub),
    "…including the panel, chevron and button it mounted");
  has(R("compare-hub.js"), "SCORING CLEANUP",
    "…and the source records why, so the buttons are not restored as a fix");
  ok(!/The overall read above reflects their record so far/.test(hub),
    "compare-hub: the thin-state line that pointed at the composite is gone too");

  const prof = CODE("profiles-full.js");
  ok(!/View Score Analysis/i.test(prof),
    "profiles-full: the 'View Score Analysis →' button is gone");
  ok(!/Driving the accountability read/i.test(prof),
    "…and the header no longer frames the panel as driving a score");
  has(R("profiles-full.js"), "Integrity &amp; consistency highlights",
    "…it names the evidence it actually shows instead");
  // The evidence itself must survive the door removal — this pass removes a
  // second score, not the material underneath it.
  has(prof, "_slDriverHeader", "the driver panel itself is still rendered");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the retired renderers emit nothing");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Whatever onclick handlers survive inside accountability-score.js are only
  // reachable through markup these functions would have returned. Each must be
  // guarded by an unconditional early return, not by a flag someone can flip.
  const src = R(OWNER);
  const RETIRED = ["_renderAccountabilityCard", "_acctCardBadge", "_acctCardCondensed"];
  for (const fn of RETIRED) {
    const i = src.indexOf("window." + fn + " = function");
    ok(i >= 0, `${fn} is still present in the repo (retired, not deleted)`);
    if (i < 0) continue;
    const head = src.slice(i, i + 2400)
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const body = head.slice(head.indexOf("{") + 1);
    ok(/^\s*return\s*(''|"")\s*;/.test(body),
      `${fn} returns '' immediately — no conditional, no flag to flip`);
  }
  has(src, "RETIREMENT COMPLETED",
    "the module records that the reader-facing doors are closed");
  has(src, "test-no-second-score",
    "…and points at this file as the thing that keeps them closed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no composite 0–100 is printed to a reader");
// ═════════════════════════════════════════════════════════════════════════════
{
  const PHRASES = [
    "Accountability Score of",
    "accountability score of",
    "Accountability Score:",
  ];
  for (const p of PHRASES) {
    const hits = SHIPPED.filter((f) => CODE(f).includes(p));
    eq(hits.length, 0, `no module prints ${JSON.stringify(p)} — found in ${hits.join(", ")}`);
  }
  // Direction Match remains the one headline, and it is a match %, not a grade.
  const wa = R("word-action.js");
  has(wa, "Direction Match", "Direction Match is still the named headline metric");
}

console.log("");
if (failures.length) {
  console.error(`✗ no second score: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ no second score: the retired composite is unreachable — ${passed} assertions passed\n`);
