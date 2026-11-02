#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-roster-seats.mjs — writes roster-seats/<state>.js, one state's seat rows
// ─────────────────────────────────────────────────────────────────────────────
// /voice and /me carry no cmp-data.js, so the only people index on them is the
// live Firestore one (window.PROFILES) — a curated set of a few hundred rows that
// holds almost nobody outside Utah. A Columbus reader's band on the homepage
// named all six of their seats; the same reader's /voice hallway named one (Jon
// Husted, who happens to be in the live index) and printed "No sitting member on
// hand for this seat" over the other five, because pdxRepsForMe()'s walks had no
// Ohio rows to walk.
//
// WHICH ROWS. For every state, every cmp-data.js record in that state that is in office
// and whose office reads as one of the seats pdxRepsForMe() resolves: U.S.
// Senator, Governor, U.S. Representative, a state legislative chamber. A SUPERSET
// of what the walks seat, deliberately: the walks in voter-hub-location.js still
// do all of the choosing (two claimants on one district still place nobody), so
// /voice reaches the homepage's answer by the homepage's own rules.
//
// UTAH IS LEGISLATORS ONLY. seated-member.js already seats Utah's legislative
// pids; what /voice lacked was a row to NAME some of them by (the live index
// files Jennifer Dailey-Provost as `jdailey`, which nothing bridges). Utah's
// statewide and congressional seats already resolve from the live index and
// are left exactly as they are. Utah writes its legislators "UT District 22".
//
// WHICH FIELDS. Only the ones those walks and the name read look at: name,
// office, state, district, position, party, rank. No bio, no stances, no photo.
//
// voter-hub-location.js fetches one file, the reader's own state's, and only on
// a document that does not load cmp-data.js.
//
//   node scripts/gen-roster-seats.mjs           # write roster-seats/*.js
//   node scripts/gen-roster-seats.mjs --check   # exit 1 if any file is stale
//
// Re-run after cmp-data.js changes; never hand-edit roster-seats/.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
export const DIR = "roster-seats";

export const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
  "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana",
  "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];
// The file name voter-hub-location.js asks for: "New York" → new-york.
export const slugOf = (state) => String(state).trim().toLowerCase().replace(/[^a-z]+/g, "-");

// The resolver's own state reader (_pdxStateName), so a row lands in exactly the
// file whose walk would have matched it.
const stateOf = (v) => String(v == null ? "" : v).split("·")[0].split("-")[0].trim().toLowerCase();
const SEAT_OFFICE = /senat|represent|governor|assembly|delegate|\bhouse\b|congress/i;
const FIELDS = ["name", "office", "state", "district", "position", "party", "rank"];

export function buildFiles() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "voter-hub-location.js"]) vm.runInContext(R(f), ctx, { filename: f });
  const C = win.CMP_DATA || {};
  const status = win._pdxOfficeStatus;
  const byState = {};
  for (const st of STATES) byState[st.toLowerCase()] = {};
  for (const pid of Object.keys(C).sort()) {
    const rec = C[pid];
    if (!rec || rec.candidate === true) continue;
    const office = String(rec.office == null ? "" : rec.office);
    const utahLeg = /^(UT|Utah)\b/.test(String(rec.state || "")) && !/^U\.S\.|governor/i.test(office);
    const bucket = utahLeg ? byState.utah : (stateOf(rec.state) === "utah" ? null : byState[stateOf(rec.state)]);
    if (!bucket) continue;
    if (!SEAT_OFFICE.test(office) || /lieutenant/i.test(office)) continue;
    if (typeof status === "function" && status(rec) !== "office") continue;
    const row = {};
    for (const k of FIELDS) {
      const v = rec[k];
      if (v === undefined || v === null || v === "") continue;
      row[k] = v;
    }
    if (!row.name) continue;
    bucket[pid] = row;
  }
  const files = {};
  for (const st of STATES) {
    const rows = byState[st.toLowerCase()];
    const body = Object.keys(rows).map((pid) => `    ${JSON.stringify(pid)}: ${JSON.stringify(rows[pid])}`).join(",\n");
    files[`${DIR}/${slugOf(st)}.js`] =
`/* roster-seats/${slugOf(st)}.js — GENERATED by scripts/gen-roster-seats.mjs. Do not edit.
   ${st}'s seat rows out of cmp-data.js, for documents that do not load it: ${st === "Utah"
     ? "the\n   in-office state legislators (Utah's statewide and congressional seats resolve\n   from the live index)," : "the\n   in-office U.S. Senators, Governor, U.S. Representatives and state legislators,"}
   with only the fields pdxRepsForMe()'s walks read. Declares no resolver and
   names no seat; voter-hub-location.js fetches it and does the choosing. */
(function () {
  'use strict';
  var T = window.PDX_SEAT_ROSTER = window.PDX_SEAT_ROSTER || {};
  var rows = {
${body}
  };
  for (var k in rows) { if (Object.prototype.hasOwnProperty.call(rows, k) && !T[k]) T[k] = rows[k]; }
  var L = window.PDX_SEAT_ROSTER_STATES = window.PDX_SEAT_ROSTER_STATES || {};
  L[${JSON.stringify(st.toLowerCase())}] = true;
  if (typeof window._pdxSeatRosterLanded === 'function') window._pdxSeatRosterLanded(${JSON.stringify(st.toLowerCase())});
})();
`;
  }
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes("--check");
  const files = buildFiles();
  let stale = [];
  if (!check) mkdirSync(join(ROOT, DIR), { recursive: true });
  for (const [f, src] of Object.entries(files)) {
    const p = join(ROOT, f);
    const cur = existsSync(p) ? readFileSync(p, "utf8") : null;
    if (cur === src) continue;
    stale.push(f);
    if (!check) writeFileSync(p, src);
  }
  // A file for a state no longer in the list is stale too.
  if (existsSync(join(ROOT, DIR))) {
    for (const f of readdirSync(join(ROOT, DIR))) if (!files[`${DIR}/${f}`]) stale.push(`${DIR}/${f} (orphan)`);
  }
  if (check) {
    if (stale.length) { console.error(`✗ roster-seats stale: ${stale.join(", ")} — run node scripts/gen-roster-seats.mjs`); process.exit(1); }
    console.log(`✓ roster-seats: ${Object.keys(files).length} files current`);
  } else {
    console.log(`wrote ${stale.length} of ${Object.keys(files).length} roster-seats files`);
  }
}
