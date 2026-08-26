#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// stance-worklist.mjs — where one sourced position would unlock a published read
// ─────────────────────────────────────────────────────────────────────────────
// Direction Match publishes only when a record clears both floors: at least
// MIN_TESTED_ITEMS tested items and MIN_TESTED_WEIGHT of combined weight
// (word-action.js). The floors are not moving. So the only honest way to publish
// on more records is to hold more INDEPENDENT word on them — and the bottleneck
// is knowing which records are one card short of being capable at all.
//
// This script answers exactly that question and nothing else.
//
// WHAT IT MEASURES, AND WHAT IT CANNOT
// A tested item needs two halves: a stated position (curated, committed, in this
// repo) and a formal action to test it against (a roll-call read, which lives in
// the database behind /api/voting-record and is only warm in a live browser). Run
// here, offline, the ACTION half is cold for every federal member — the real
// engine returns `warming: true` and `tested: 0`. That is not a bug to work
// around, and this script does not try: it measures the half it can actually see.
//
//   CAPABLE  — the count of SCORED items PDXWordAction.read() found, and their
//              combined tier weight. That is the CEILING on tested items: an item
//              that is not scorable can never be tested, however complete the
//              record read becomes. A record whose ceiling is below the floors can
//              never publish a Direction Match no matter what the database says.
//   SHORT    — how many more scorable items (on new issues) that ceiling needs.
//              A record at 2 scorable items is ONE card away from being capable.
//              A record at 0 is three away. That difference is the whole point of
//              ranking this list.
//
// It never says a record WILL publish. Clearing the ceiling makes a published read
// possible, not certain — the formal record still has to hold something on those
// issues. "Capable" is the honest word and it is the one used throughout.
//
// THE TWO CHEAP CLASSES, NAMED SEPARATELY
// Two shortfalls need no new research at all, and mixing them into one number
// would hide the cheapest work in the archive:
//
//   MAPPING   — `notIssueLinked`: word we already hold, sourced, that is not tied
//               to a tracked issue key, so no formal action can be matched to it.
//               A curator assigning the key unlocks it. No new source needed.
//   CIRCULAR  — `recordDerived`: positions written up FROM the formal record. Held
//               out by the circularity rule (isIndependentWord), permanently: a
//               position drawn from a vote cannot test that same vote. These need
//               an INDEPENDENT source for the same view — a quote, an interview, a
//               questionnaire — not a re-read of the vote.
//
// WHAT IT REFUSES TO DO
//   · It does not author a position, propose one, or guess what anyone believes.
//     It names a PERSON and a SHORTFALL. What they said is a research question with
//     a citation attached, and no ranking of ours supplies one.
//   · It does not suggest which issue a person "should" have word on. Picking the
//     issue would be picking the answer.
//   · It does not lower, read, or recompute a floor. The floors come off the real
//     PDXWordAction and are printed for reference only.
//   · It writes nothing. There is no --out, no seed, no data file. The output is a
//     worklist for a human, on stdout.
//
//   node scripts/stance-worklist.mjs                      # the default worklist
//   node scripts/stance-worklist.mjs --lane federal       # federal only
//   node scripts/stance-worklist.mjs --lane utah          # the Utah ballot set
//   node scripts/stance-worklist.mjs --short 1            # one card from capable
//   node scripts/stance-worklist.mjs --pid massie         # one record, in detail
//   node scripts/stance-worklist.mjs --summary            # counts only
//   node scripts/stance-worklist.mjs --json               # machine-readable
//
// Deterministic: no network, no database, no clock, no randomness. Ordering is
// shortfall then leverage then pid.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The real browser modules, in load order, in the shared sandbox — so the floors,
// the circularity rule and the scorable set are the SHIPPED ones and cannot drift
// from what a reader sees.
const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "consistency.js",
  "word-action.js",
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
for (const f of FILES) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}

const WA = win.PDXWordAction;
const DATA = win.CMP_DATA || {};
if (!WA || typeof WA.read !== "function") {
  console.error("word-action.js did not publish PDXWordAction.read — refusing to guess at the floors");
  process.exit(2);
}
const FLOOR_ITEMS = WA.MIN_TESTED_ITEMS;
const FLOOR_WEIGHT = WA.MIN_TESTED_WEIGHT;
if (!FLOOR_ITEMS || !FLOOR_WEIGHT) {
  console.error("the publication floors are not readable off PDXWordAction — refusing to invent them");
  process.exit(2);
}

// ── Lanes ────────────────────────────────────────────────────────────────────
// The brief asks for depth on the people voters actually open — the federal set
// and the Utah ballot set — over spray coverage. Lane membership is read off the
// committed profile, never inferred from a name.
const FEDERAL_OFFICE = /^(U\.S\. (Representative|Senator)|President|Vice President)/i;
function laneOf(p) {
  const office = String((p && p.office) || "");
  const state = String((p && p.state) || "");
  if (FEDERAL_OFFICE.test(office) || /^Federal$/i.test(state)) return "federal";
  if (/^Utah\b/i.test(state)) return "utah";
  return "other";
}

// ── One record's word-side capability ────────────────────────────────────────
function assess(pid) {
  const p = DATA[pid];
  if (!p) return null;
  let r;
  try {
    r = WA.read(pid, p);
  } catch (e) {
    // A record the engine cannot read is not a record with no word. Say so and
    // leave it out of every count rather than scoring it zero.
    return { pid, name: (p && p.name) || pid, lane: laneOf(p), unreadable: String(e && e.message || e) };
  }
  if (!r || !r.coverage) {
    return { pid, name: (p && p.name) || pid, lane: laneOf(p), unreadable: "read() returned no coverage" };
  }

  const scoredItems = (r.items || []).filter((it) => it && it.scored);
  // The ceiling: sum of the TIER weights of the scorable items. The live read can
  // only ever add to this (the evidence multiplier is >= 1), so a ceiling below
  // the weight floor is a hard "cannot publish", not a "not yet".
  const capableWeight = scoredItems.reduce((n, it) => n + (+it.weight || 0), 0);
  const capableItems = scoredItems.length;
  const capable = capableItems >= FLOOR_ITEMS && capableWeight >= FLOOR_WEIGHT;

  // How many MORE scorable items this record needs before the ceiling clears
  // both floors. A new scorable item is worth at least 1 (branding) and usually 2
  // (a sourced position), so the item shortfall is exact and the weight shortfall
  // is stated separately rather than converted into a guess about tiers.
  const shortItems = Math.max(0, FLOOR_ITEMS - capableItems);
  const shortWeight = Math.max(0, FLOOR_WEIGHT - capableWeight);
  // The binding shortfall, in cards. One more sourced position carries 2 weight;
  // this is the smallest number of NEW scorable positions that could clear both,
  // and it is a floor on the work, never a promise about it.
  const short = Math.max(shortItems, Math.ceil(shortWeight / 2));

  const cov = r.coverage;
  return {
    pid,
    name: (p && p.name) || pid,
    office: String((p && p.office) || ""),
    state: String((p && p.state) || ""),
    lane: laneOf(p),
    // Held word, all of it, scorable or not.
    word: cov.word || 0,
    // The ceiling.
    capableItems,
    capableWeight,
    capable,
    short,
    shortWeight,
    // The two classes of shortfall that need no new source.
    mapping: cov.notIssueLinked || 0,
    circular: cov.recordDerived || 0,
    // What the live read says here, offline, for honesty about what is NOT known.
    warming: !!cov.warming,
    publishableOffline: !!r.publishable,
    issues: scoredItems.map((it) => it.issueKey).filter(Boolean),
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, dflt = null) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
};
if (argv.includes("-h") || argv.includes("--help")) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8")
    .split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n"));
  process.exit(0);
}

const wantLane = String(flag("lane", "all")).toLowerCase();
const wantShort = flag("short", null);
const wantPid = flag("pid", null);
const asJson = argv.includes("--json");
const summaryOnly = argv.includes("--summary");
const limit = Number(flag("limit", 40)) || 40;

const pids = Object.keys(DATA).sort();
const all = pids.map(assess).filter(Boolean);
const unreadable = all.filter((r) => r.unreadable);
let rows = all.filter((r) => !r.unreadable);

if (wantPid) {
  rows = rows.filter((r) => r.pid === String(wantPid));
  if (!rows.length) {
    console.error(`no record named ${wantPid} in cmp-data.js`);
    process.exit(1);
  }
}
if (wantLane !== "all") rows = rows.filter((r) => r.lane === wantLane);

// ── The counts, before any filtering by shortfall ─────────────────────────────
const lanes = ["federal", "utah", "other"];
const tally = {};
for (const L of lanes.concat(["all"])) {
  const set = L === "all" ? rows : rows.filter((r) => r.lane === L);
  tally[L] = {
    people: set.length,
    capable: set.filter((r) => r.capable).length,
    oneShort: set.filter((r) => r.short === 1).length,
    twoShort: set.filter((r) => r.short === 2).length,
    noWord: set.filter((r) => r.word === 0).length,
    mappingHeld: set.reduce((n, r) => n + r.mapping, 0),
    circularHeld: set.reduce((n, r) => n + r.circular, 0),
  };
}

// The worklist itself: not capable yet, closest first. Leverage breaks ties — a
// record already holding word that is merely unmapped or circularly-held is
// cheaper to unlock than one holding nothing at all.
const leverage = (r) => r.mapping * 2 + r.circular;
let work = rows.filter((r) => !r.capable);
if (wantShort !== null && wantShort !== true) {
  work = work.filter((r) => r.short === Number(wantShort));
}
work.sort((a, b) =>
  a.short - b.short ||
  leverage(b) - leverage(a) ||
  b.word - a.word ||
  a.pid.localeCompare(b.pid));

if (asJson) {
  console.log(JSON.stringify({
    floors: { items: FLOOR_ITEMS, weight: FLOOR_WEIGHT },
    measured: "word side only — the formal-action half is a live database read and is cold here",
    lane: wantLane,
    tally,
    unreadable: unreadable.map((r) => ({ pid: r.pid, why: r.unreadable })),
    worklist: work.slice(0, wantPid ? work.length : limit),
  }, null, 2));
  process.exit(0);
}

// ── Report ───────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const num = (s, n) => String(s).padStart(n);

console.log("");
console.log("  STATED-POSITION WORKLIST — where one sourced card would make a read possible");
console.log("  " + "─".repeat(74));
console.log(`  Floors (from word-action.js, unchanged): ${FLOOR_ITEMS} tested items · ${FLOOR_WEIGHT} combined weight`);
console.log("  Measured here: the WORD side only. The formal-action half is a live");
console.log("  database read and is cold offline, so nothing below claims a record WILL");
console.log("  publish — only that its ceiling of scorable word is or is not capable of it.");
console.log("");

for (const L of (wantLane === "all" ? ["federal", "utah", "other", "all"] : [wantLane])) {
  const t = tally[L];
  if (!t || !t.people) continue;
  console.log(`  ${pad(L.toUpperCase(), 9)} ${num(t.people, 4)} records · ` +
    `${num(t.capable, 4)} word-capable · ${num(t.oneShort, 4)} one card short · ` +
    `${num(t.twoShort, 4)} two short · ${num(t.noWord, 4)} no word at all`);
  console.log(`  ${" ".repeat(9)} held without new research: ` +
    `${t.mappingHeld} unmapped item(s) · ${t.circularHeld} written from the record`);
}
console.log("");

if (unreadable.length) {
  console.log(`  ${unreadable.length} record(s) the engine could not read — excluded from every count above:`);
  unreadable.slice(0, 8).forEach((r) => console.log(`     · ${r.pid} — ${r.unreadable}`));
  console.log("");
}

if (summaryOnly) process.exit(0);

if (!work.length) {
  console.log("  Nothing on the worklist under these filters.");
  console.log("");
  process.exit(0);
}

console.log(`  THE WORKLIST — ${work.length} record(s) not yet word-capable, closest first` +
  (work.length > limit && !wantPid ? ` (showing ${limit})` : ""));
console.log("  " + "─".repeat(74));
console.log(`  ${pad("short", 6)}${pad("pid", 26)}${pad("held", 5)}${pad("cap", 4)}${pad("wt", 4)}${pad("unmapped", 9)}${pad("circular", 9)}lane`);
for (const r of (wantPid ? work : work.slice(0, limit))) {
  console.log(`  ${pad("+" + r.short, 6)}${pad(r.pid, 26)}${num(r.word, 4)} ${num(r.capableItems, 3)} ${num(r.capableWeight, 3)} ` +
    `${num(r.mapping, 8)} ${num(r.circular, 8)} ${r.lane}`);
}

if (wantPid) {
  // One record, in detail. The issues already carrying a scorable item are a
  // FACT about what is on file, printed because word-action.js scores one item
  // per issue — a second card on an issue already held adds nothing to the
  // ceiling. It is not a hint about which issue to go and find.
  const r = work[0] || rows[0];
  if (r) {
    console.log("  Issues already carrying a scorable item on this file:");
    console.log(r.issues.length
      ? "     " + Array.from(new Set(r.issues)).sort().join(", ")
      : "     none");
    console.log("  A second card on an issue in that list does not raise the ceiling —");
    console.log("  word-action.js scores one item per issue. Only a NEW issue moves this line.");
    if (r.warming) {
      console.log("  The formal-action read is cold here, so this file's tested count is unknown");
      console.log("  offline. Capability is the only thing measured.");
    }
    console.log("");
  }
}
console.log("  short     new scorable positions needed before the ceiling clears both floors");
console.log("  held      documented items on file, scorable or not");
console.log("  cap/wt    the ceiling: scorable items and their combined tier weight");
console.log("  unmapped  word on file not tied to a tracked issue — a curator keys it, no new source");
console.log("  circular  positions written from the formal record — held by the circularity rule;");
console.log("            these need an INDEPENDENT source for the same view, not a re-read of the vote");
console.log("");
console.log("  This list names people and shortfalls. It does not name a position, propose one,");
console.log("  or suggest which issue anyone should have word on — picking the issue would be");
console.log("  picking the answer. Every card that closes a line here needs a real citation.");
console.log("");
