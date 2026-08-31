#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-formal-index.mjs — ship the formal record's SHAPE to the two runtimes
//                        that have to decide what a file is before it loads
// ─────────────────────────────────────────────────────────────────────────────
// THE PROBLEM THIS EXISTS TO FIX
//
// The publication floor (publication-floor.js) reads two things: the roster and
// the stance data. Both are in the repo, which is why the floor can run in the
// browser AND in Node. The formal record — roll calls and committee acts — is
// not: it lives in the database behind /api/voting-record. So the floor was
// blind to it, and asked "does this record earn a citable address?" about people
// whose files hold ninety sourced formal acts it could not see. It answered no,
// and the person-file kicker printed "record still being built" on the two
// deepest files in the Utah lane.
//
// That is not a floor that is too strict. It is a floor reading two of its three
// sources. This script supplies the third, in the only form both runtimes can
// read: a generated, committed, deterministic count.
//
// WHAT IT COUNTS, AND FROM WHAT
//
// The shipped Utah lane seeds — the same files scripts/vr-utah-fpi.mjs assembles
// its lane from, in the same order, under the same verifiability guard:
//
//   floor      db/vr-utah-vote-seed{,-2024GS,-2023GS}.json
//   committee  db/vr-utah-committee-seed{,-2024GS,-2023GS}.json
//   mapping    db/vr-utah-committee-mapping-seed-{2025GS,2024GS,2023GS}.json
//
// A roll call with no sourceUrl is skipped, exactly as the FPI harness skips it:
// an act nobody can follow to a published page is not a citation and must not
// earn an address. A committee act with neither sourceUrl nor minutesUrl is
// skipped for the same reason.
//
// Two numbers per person, and no third:
//
//   acts       every sourced act on file, including committee votes marked
//              supersededByFloorVote. Those are on file and sourced; whether the
//              pattern engine CHARACTERISES them is the engine's call, not this
//              file's, and this file does not pre-empt it.
//   measures   distinct session|bill with at least one sourced act. This is the
//              number the floor reads, because "two documented positions" has
//              always meant two subjects, not one subject voted on twice.
//
// WHAT IT IS NOT
//
//   · Not a score, not a ranking, not a tier. Two integers and a sentence. The
//     numbers never reach a surface: the kicker they inform is forbidden to
//     print a figure of any kind, and it prints none.
//   · Not a second formal record. It is a count OF the record, generated from
//     the seeds the record was ingested from, and it can only ever agree with
//     them because it is regenerated from them. The live record is still
//     /api/voting-record; every surface that shows an act shows it from there.
//   · Not federal. No federal seed is read, no federal id gains a count, and a
//     federal file is empty here by design.
//
// It also carries the reviewed empty-file notes from
// db/vr-utah-empty-file-notes.json, copied verbatim, so the browser can say WHY
// a file is empty in one fetch-free sentence. Those are hand-written; everything
// else in the output is derived.
//
// USAGE
//   node scripts/gen-formal-index.mjs            # write formal-index.js
//   node scripts/gen-formal-index.mjs --check    # exit 1 if it is stale
//   node scripts/gen-formal-index.mjs --report   # what was counted, and the tail
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
const CHECK = process.argv.includes("--check");
const REPORT = process.argv.includes("--report");
const OUT = join(ROOT, "formal-index.js");

// Same three feeders as scripts/vr-utah-fpi.mjs, in the order they shipped.
const FLOOR = [["2025GS", "db/vr-utah-vote-seed.json"],
               ["2024GS", "db/vr-utah-vote-seed-2024GS.json"],
               ["2023GS", "db/vr-utah-vote-seed-2023GS.json"]];
const COMMITTEE = [["2025GS", "db/vr-utah-committee-seed.json"],
                   ["2024GS", "db/vr-utah-committee-seed-2024GS.json"],
                   ["2023GS", "db/vr-utah-committee-seed-2023GS.json"]];
const MAPPING = [["2025GS", "db/vr-utah-committee-mapping-seed-2025GS.json"],
                 ["2024GS", "db/vr-utah-committee-mapping-seed-2024GS.json"],
                 // 2023GS shipped its reviewed mapping seed after this generator was
                 // written and was never added here, so 607 sourced committee votes
                 // across 87 members were live in scripts/vr-utah-fpi.mjs and invisible
                 // to the count the publication floor reads. Restoring it moves no band
                 // and crosses no floor — nobody here was empty, and nobody was sitting
                 // on one documented measure — it just stops the index under-reporting a
                 // record the app already publishes.
                 ["2023GS", "db/vr-utah-committee-mapping-seed-2023GS.json"]];
const NOTES = "db/vr-utah-empty-file-notes.json";

const acts = new Map();          // pid -> count
const measures = new Map();      // pid -> Set(session|bill)
const stats = { rollcalls: 0, unsourcedRollcalls: 0, floorVotes: 0,
                committeeActs: 0, unsourcedActs: 0, committeeVotes: 0, people: 0 };

const bump = (pid, key) => {
  if (!pid || typeof pid !== "string") return;
  acts.set(pid, (acts.get(pid) || 0) + 1);
  if (!measures.has(pid)) measures.set(pid, new Set());
  measures.get(pid).add(key);
};

for (const [session, f] of FLOOR) {
  for (const m of J(f).measures || []) {
    const key = `${session}|${m.utahBill}`;
    for (const rc of m.rollcalls || []) {
      stats.rollcalls++;
      if (!rc.sourceUrl) { stats.unsourcedRollcalls++; continue; }
      for (const v of rc.votes || []) { stats.floorVotes++; bump(v.politicianId, key); }
    }
  }
}
for (const [session, f] of [...COMMITTEE, ...MAPPING]) {
  if (!existsSync(join(ROOT, f))) continue;
  for (const m of J(f).measures || []) {
    const key = `${session}|${m.utahBill}`;
    for (const a of m.committeeActs || []) {
      stats.committeeActs++;
      if (!a.sourceUrl && !a.minutesUrl) { stats.unsourcedActs++; continue; }
      for (const v of a.votes || []) { stats.committeeVotes++; bump(v.politicianId, key); }
    }
  }
}

const pids = [...acts.keys()].sort();
stats.people = pids.length;

// ── the reviewed empty-file notes, verbatim ─────────────────────────────────
const notesDoc = J(NOTES);
const noteEntries = Object.entries(notesDoc.notes || {}).sort(([a], [b]) => a.localeCompare(b));
// A note about a person who HAS a formal record is a contradiction: the note
// would say "empty" beside a file that is not. Fail loudly rather than ship both.
const contradictions = noteEntries.filter(([pid]) => acts.has(pid));
if (contradictions.length) {
  console.error(`gen-formal-index: ${contradictions.length} empty-file note(s) name a pid that HAS formal acts on file: ` +
    contradictions.map(([pid]) => `${pid} (${acts.get(pid)})`).join(", "));
  process.exit(2);
}

// ── AND THE OTHER DIRECTION: AN EMPTY FILE WITH NO NOTE ─────────────────────
// The check above stops a note from contradicting a record. This one stops the
// set of notes from going quietly incomplete, which is the failure that actually
// ships: add a session, or a roster wave seats four new members, and four person
// files go empty with nothing to say about why — and the surfaces that read this
// index fall back to "record still being built" on people who will never have a
// record here. The note file is hand-written on purpose, so the only way to keep
// it honest is to fail the build when a Utah roster member has neither an act
// nor a reviewed sentence.
//
// The denominator is the one scripts/vr-utah-fpi.mjs already publishes as "on
// roster", derived the same way from the same two lists — the reviewed member
// maps plus any CMP_DATA profile whose office names a seat in the Utah
// Legislature. Nobody is added or removed here to make a number move.
const UT_OFFICE = /(Utah State|UT State) (Representative|Senator)|Utah (Senate President|House Speaker)|UT (House|Senate) (Speaker|President)/;
function utahRoster() {
  const out = new Set();
  for (const f of ["db/vr-utah-member-map.json", "db/vr-utah-member-map-2024GS.json",
                   "db/vr-utah-member-map-2023GS.json"]) {
    if (!existsSync(join(ROOT, f))) continue;
    const d = J(f);
    for (const ch of Object.values(d.chambers || {})) {
      for (const v of Object.values(ch)) {
        const pid = v && typeof v === "object" ? v.politicianId : v;
        if (pid) out.add(pid);
      }
    }
  }
  const ctx = vm.createContext({ console, window: {} });
  ctx.window.window = ctx.window;
  new vm.Script(R("cmp-data.js"), { filename: "cmp-data.js" }).runInContext(ctx);
  const D = ctx.window.CMP_DATA || {};
  for (const pid of Object.keys(D)) if (D[pid] && UT_OFFICE.test(D[pid].office || "")) out.add(pid);
  return out;
}
const ROSTER = utahRoster();
const noted = new Set(noteEntries.map(([pid]) => pid));
const unexplained = [...ROSTER].filter((pid) => !acts.has(pid) && !noted.has(pid)).sort();
if (unexplained.length) {
  console.error(`gen-formal-index: ${unexplained.length} Utah roster member(s) hold no formal act and have no reviewed ` +
    `note saying why: ${unexplained.join(", ")}\n  write one line each in ${NOTES} — an empty file is a documentation ` +
    `status and has to be able to say which one.`);
  process.exit(2);
}
// A note for somebody who is not on the Utah roster at all cannot be read
// against anything, and would sit in the shipped index forever.
const strangers = noteEntries.map(([pid]) => pid).filter((pid) => !ROSTER.has(pid));
if (strangers.length) {
  console.error(`gen-formal-index: ${strangers.length} empty-file note(s) name a pid that is not on the Utah roster: ` +
    strangers.join(", "));
  process.exit(2);
}

const q = (s) => "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ") + "'";
const body = [
  "/* ═══════════════════════════════════════════════════════════════════════════",
  "   formal-index.js — GENERATED. Do not edit by hand.",
  "     regenerate:  node scripts/gen-formal-index.mjs",
  "   ────────────────────────────────────────────────────────────────────────────",
  "   How much formal record is on file per person, and — where a file is empty —",
  "   one reviewed sentence saying why. Counted from the shipped Utah lane seeds;",
  "   see scripts/gen-formal-index.mjs for what is counted and what is refused.",
  "",
  "   TWO CALLERS, ONE COUNT. publication-floor.js reads this as its third source,",
  "   so a file holding sourced formal acts and no cited stance card is no longer",
  "   greeted with \"record still being built\"; and person-file.js reads it to pick",
  "   which of three honest things the kicker says. It carries no score, no tier",
  "   and no ranking, and no surface prints these figures.",
  "   ═══════════════════════════════════════════════════════════════════════════ */",
  "(function () {",
  "  'use strict';",
  "  var root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);",
  "  if (root.PDXFormalIndex) return;",
  "",
  "  var SESSIONS = [" + (notesDoc.sessionsOnFile || []).map(q).join(", ") + "];",
  "",
  "  // pid -> [sourced acts on file, distinct measures with a sourced act]",
  "  var COUNTS = {",
  ...pids.map((pid) => `    ${q(pid)}: [${acts.get(pid)}, ${measures.get(pid).size}],`),
  "  };",
  "",
  "  // pid -> [reason code, one reviewed sentence]. Documentation status, never a",
  "  // verdict on the person. Hand-written in db/vr-utah-empty-file-notes.json.",
  "  var EMPTY = {",
  ...noteEntries.map(([pid, n]) => `    ${q(pid)}: [${q(n.reason)}, ${q(n.note)}],`),
  "  };",
  "",
  "  function row(pid) { return (typeof pid === 'string' && COUNTS[pid]) || null; }",
  "  function acts(pid) { var r = row(pid); return r ? r[0] : 0; }",
  "  function measures(pid) { var r = row(pid); return r ? r[1] : 0; }",
  "  function has(pid) { return acts(pid) > 0; }",
  "  function emptyNote(pid) {",
  "    if (has(pid)) return null;              // not empty: the note would be false",
  "    var e = (typeof pid === 'string' && EMPTY[pid]) || null;",
  "    return e ? { reason: e[0], note: e[1] } : null;",
  "  }",
  "",
  "  root.PDXFormalIndex = {",
  "    SESSIONS_ON_FILE: SESSIONS,",
  "    acts: acts,",
  "    measures: measures,",
  "    has: has,",
  "    emptyNote: emptyNote,",
  "    _counts: COUNTS,",
  "    _empty: EMPTY",
  "  };",
  "})();",
  "",
].join("\n");

if (REPORT) {
  console.log(`roll calls          ${stats.rollcalls} (${stats.unsourcedRollcalls} unsourced, skipped)`);
  console.log(`committee acts      ${stats.committeeActs} (${stats.unsourcedActs} unsourced, skipped)`);
  console.log(`member votes        ${stats.floorVotes} floor + ${stats.committeeVotes} committee`);
  console.log(`people with a count ${stats.people}`);
  const two = pids.filter((p) => measures.get(p).size >= 2).length;
  console.log(`  >= 2 measures     ${two}`);
  console.log(`  exactly 1 measure ${pids.length - two}`);
  console.log(`empty-file notes    ${noteEntries.length} (Utah roster ${ROSTER.size}, ${ROSTER.size - [...ROSTER].filter((p) => acts.has(p)).length} empty, 0 unexplained)`);
  const tail = pids.slice().sort((a, b) => measures.get(a).size - measures.get(b).size).slice(0, 8);
  console.log(`thinnest on file    ${tail.map((p) => `${p}:${measures.get(p).size}`).join(", ")}`);
} else if (CHECK) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (cur !== body) {
    console.error("stale: formal-index.js — run: node scripts/gen-formal-index.mjs");
    process.exit(1);
  }
  console.log(`formal-index.js is current (${stats.people} people, ${noteEntries.length} empty-file notes)`);
} else {
  writeFileSync(OUT, body);
  console.log(`wrote formal-index.js (${stats.people} people with formal acts on file, ${noteEntries.length} empty-file notes)`);
}
