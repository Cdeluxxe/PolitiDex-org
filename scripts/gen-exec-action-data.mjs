#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ✒️ Executive Enactment Record — generate the client action data
// ─────────────────────────────────────────────────────────────────────────────
// db/exec-action-seed.json is the curated truth. Two consumers read it:
//
//   1. netlify/database/migrations/20260807000000_seed_exec_actions_wave1.sql
//      writes the same rows into the vr_* spine (hand-derived; scripts/test-exec-seed.mjs
//      asserts the SQL and the JSON agree).
//   2. exec-action-data.js — this file's output — exposes the same rows to the
//      browser as window.EXEC_ACTIONS, which is what exec-record.js reads.
//
// The client copy is GENERATED rather than hand-maintained for one reason: a
// hand-copied second copy of curated data drifts, and drift here is not cosmetic —
// the profile would publish a standing or a citation the seed no longer says. So the
// build is a pure function of the seed, and scripts/test-exec-data.mjs re-runs it in
// memory and fails if the shipped file differs by a single byte.
//
// What is stripped: every key whose name begins with "_". Those are curation
// commentary (_citationNote, _issuesNote, _axisBNote, _dedupeNote, _standingBackfill),
// addressed to whoever edits the seed next. They are long, they are not rendered, and
// shipping them would put several KB of editorial notes into every page load. The
// substantive prose the UI DOES render — each issue's `rationale` and each standing's
// `note` — carries no underscore and is kept in full.
//
//   node scripts/gen-exec-action-data.mjs        # writes exec-action-data.js
//
// Deterministic: no timestamps, no randomness, stable key order (source order of the
// seed). Re-running it on an unchanged seed produces an identical file.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const SEED_PATH = "db/exec-action-seed.json";
export const OUT_PATH = "exec-action-data.js";

// Recursively drop "_"-prefixed keys, preserving array and key order.
export function stripNotes(v) {
  if (Array.isArray(v)) return v.map(stripNotes);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (k.charAt(0) === "_") continue;
      out[k] = stripNotes(val);
    }
    return out;
  }
  return v;
}

export function buildExecActionData(seed) {
  const actions = stripNotes(seed.actions || {});
  // Indent the payload one level so it reads as part of the IIFE rather than as a
  // wall of flush-left JSON.
  const body = JSON.stringify(actions, null, 2).split("\n").join("\n  ");
  return `/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — ✒️ EXECUTIVE ENACTMENT RECORD · action data (window.EXEC_ACTIONS)
   ═══════════════════════════════════════════════════════════════════════════
   GENERATED FILE — do not edit by hand.
     source:    ${SEED_PATH}
     generator: scripts/gen-exec-action-data.mjs
     gate:      scripts/test-exec-data.mjs (fails if this file drifts from the seed)

   Edit the seed and re-run the generator. A hand edit here would be silently
   reverted by the next generation, and worse, would let the browser publish a
   standing or a citation the curated seed does not carry.

   WHAT THIS IS
   The formal actions on file for each executive figure — signed legislation,
   vetoes, executive orders and formal directives — in exactly the shape
   exec-record.js's actionsFor() / standingOf() already read: per-issue mappings
   with a direction, and an append-only standing log where every entry carries its
   own citation. Curation commentary ("_"-prefixed keys in the seed) is stripped;
   the rationales and standing notes the UI renders are kept in full.

   WHY IT IS ITS OWN FILE
   It is loaded only where an executive profile can be rendered, so the read path
   (exec-record.js) and the vocabulary stay useful in contexts that never need the
   payload. exec-record.js reads window.EXEC_ACTIONS lazily and returns an honest
   empty record when it is absent, so a page that omits this file shows nothing
   rather than guessing — which is also what happens offline before it loads.

   NO SCORE LIVES HERE. There is no ratio, no total and no field that could become
   one; see exec-record.js's header for why a percentage over these rows would
   divide by a number we invented.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  // Idempotent, and never clobbers a payload another surface already installed.
  if (window.EXEC_ACTIONS) return;
  window.EXEC_ACTIONS = ${body};
})();
`;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// Run directly → write the file. Imported by the test → just the pure builder.
if (process.argv[1] && process.argv[1].endsWith("gen-exec-action-data.mjs")) {
  const seed = JSON.parse(readFileSync(join(ROOT, SEED_PATH), "utf8"));
  const text = buildExecActionData(seed);
  writeFileSync(join(ROOT, OUT_PATH), text);
  const n = Object.keys(seed.actions || {}).reduce((a, k) => a + seed.actions[k].length, 0);
  console.log(`✓ wrote ${OUT_PATH} — ${n} action(s) across ${Object.keys(seed.actions || {}).length} figure(s), ${text.length} bytes`);
}
