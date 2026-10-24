#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislator-shells-ny-pa-il.mjs — sitting New York, Pennsylvania
// and Illinois state legislators, named on the seat card
// ─────────────────────────────────────────────────────────────────────────────
// cmp-data.js carries a thin roster shell — name, office, state, exact district,
// `candidate: false` — for every member the chamber's official roster listed as
// seated on the read date, and db/roster-state-legislators-ny-pa-il-2026-oct.json
// is the record of what was read, what was vacant, which seats were left empty
// because the member is already on file under another id, and the one existing
// record (Michael Gianaris, SD 12) the Senate lists as no longer serving.
//
// What it pins:
//
//   1. A NEW YORK, PENNSYLVANIA AND ILLINOIS ADDRESS whose resolved seats have a
//      shell names that person on the card, in both chambers.
//   2. A SEAT WITH NO SHELL (New York SD 12, vacant; a member held only as a
//      candidate row) still reads "District N — no member on file yet".
//   3. EVERY SEAT IN ALL SIX CHAMBERS names exactly the record's pid or nobody,
//      and every shell is identity-only and claims the seat it is placed in.
//   4. THE OTHER 47 STATES AND D.C. are identical to HEAD's resolver, and the
//      California, Texas and Florida shells are byte-identical to HEAD's.
//   5. NO EQUITY LANGUAGE, and the shell moved because cmp-data.js did.
//
//   node scripts/test-state-legislator-shells-ny-pa-il.mjs

import { R, HEAD, boot, levelOf, band } from "./state-leg-harness.mjs";
import vm from "node:vm";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ ny/pa/il legislator shells: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

const REC = JSON.parse(R("db/roster-state-legislators-ny-pa-il-2026-oct.json"));
must(REC.rows && REC.rows.length > 600, "the record lists no shells");
const CH = { "State Senate": "statesenate", "State House": "statehouse" };

const at = (state, city, county, cd, sd, hd) => ({ state, city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });

// ═════════════════════════════════════════════════════════════════════════════
section("1 · an address in each state names the member of each seat it resolved");
// ═════════════════════════════════════════════════════════════════════════════
// Real places, and the seats TIGERweb's 2024 layers (5, 6) draw them into.
const NAMED = [
  // [location, senate pid, senate name, lower pid, lower name]
  [at("New York", "Astoria", "Queens County", "14", "59", "36"), "gonzalez_ny", "Kristen Gonzalez", "moreno_ny", "Diana C. Moreno"],
  [at("Pennsylvania", "Philadelphia", "Philadelphia County", "3", "1", "182"), "saval_pa", "Nikil Saval", "waxman_pa", "Ben Waxman"],
  [at("Illinois", "Chicago", "Cook County", "7", "3", "6"), "hunter_il", "Mattie Hunter", "harper_il", "Sonya M. Harper"],
];
for (const [loc, sp, sn, lp, ln] of NAMED) {
  const W = boot(Object.assign({}, loc));
  must(typeof W._pdxStateLegSeat === "function", "the resolver did not load");
  const ss = levelOf(W, "statesenate"), sh = levelOf(W, "statehouse");
  eq(ss && ss.pid, sp, `${loc.state}: SD ${loc.stateSenateDistrict} did not name its member`);
  eq(sh && sh.pid, lp, `${loc.state}: lower-chamber ${loc.stateHouseDistrict} did not name its member`);
  eq(W.CMP_DATA[sp].name, sn, `${loc.state}: senate fixture name drifted`);
  eq(W.CMP_DATA[lp].name, ln, `${loc.state}: lower-chamber fixture name drifted`);
  const out = band(W);
  has(out, sn, `${loc.state}: the State Senate member is not on the card`);
  has(out, ln, `${loc.state}: the lower-chamber member is not on the card`);
  lacks(out, `District ${loc.stateSenateDistrict} — no member on file yet`, `${loc.state}: the named State Senate seat still says nobody is on file`);
  lacks(out, `District ${loc.stateHouseDistrict} — no member on file yet`, `${loc.state}: the named lower-chamber seat still says nobody is on file`);
  eq(W.pdxSeatClaim(sp, "statesenate", loc.stateSenateDistrict) === "mismatch", false, `${loc.state}: ${sp} contradicts its seat`);
  eq(W.pdxSeatClaim(lp, "statehouse", loc.stateHouseDistrict) === "mismatch", false, `${loc.state}: ${lp} contradicts its seat`);
}
{
  // Leaders already on file, now carrying the district the official roster gives.
  const P = boot(at("Pennsylvania", "Philadelphia", "Philadelphia County", "3", "1", "191"));
  eq(levelOf(P, "statehouse").pid, "joanna_mcclinton", "Pennsylvania HD 191: the Speaker's existing record is not the one named");
  const I = boot(at("Illinois", "Oak Park", "Cook County", "7", "39", "7"));
  eq(levelOf(I, "statesenate").pid, "don_harmon", "Illinois SD 39: the Senate President's existing record is not the one named");
  eq(levelOf(I, "statehouse").pid, "chris_welch", "Illinois HD 7: the Speaker's existing record is not the one named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a seat with no shell still says nobody is on file");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Sunnyside, Queens: SD 12 (vacant since Michael Gianaris left on 2026-08-10)
  // and AD 37 (its member is on file only as a 2026 U.S. House candidate row).
  const W = boot(at("New York", "Sunnyside", "Queens County", "7", "12", "37"));
  eq(levelOf(W, "statesenate").pid, null, "New York SD 12 (vacant): a member was named");
  eq(levelOf(W, "statehouse").pid, null, "New York AD 37 (candidate row only): a member was named");
  const out = band(W);
  has(out, "District 12 — no member on file yet", "New York SD 12: the row does not say nobody is on file");
  has(out, "District 37 — no member on file yet", "New York AD 37: the row does not say nobody is on file");
  lacks(out, "Gianaris", "New York SD 12: the former senator is still on the card");
  eq(W.CMP_DATA.gianaris_ny.office, "Former New York State Senator", "gianaris_ny: the record still reads as sitting");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every seat in all six chambers names the record's pid or nobody");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = boot(at("Pennsylvania", "Harrisburg", "Dauphin County", "10", "15", "103"));
  const want = {};
  for (const r of [...REC.rows, ...REC.alreadyHeld, ...REC.districtSet]) want[`${r.state}|${CH[r.chamber]}|${r.district}`] = r.pid;
  const vacant = new Set();
  for (const st in REC.vacant) for (const ch in REC.vacant[st]) for (const d of REC.vacant[st][ch]) vacant.add(`${st}|${ch}|${d}`);
  for (const r of REC.onFileAsCandidate) {
    ok(W.CMP_DATA[r.pid] && W.CMP_DATA[r.pid].candidate === true, `record: ${r.pid} is not a candidate row`);
    ok(!want[`${r.state}|${CH[r.chamber]}|${r.district}`], `record: ${r.pid}'s seat was given a shell as well`);
  }
  const SIZE = { "New York": [63, 150], Pennsylvania: [50, 203], Illinois: [59, 118] };
  let named = 0, empty = 0;
  for (const [st, [nSen, nLow]] of Object.entries(SIZE)) {
    for (const [ch, max] of [["statesenate", nSen], ["statehouse", nLow]]) {
      for (let d = 1; d <= max; d++) {
        const key = `${st}|${ch}|${d}`;
        const got = W._pdxStateLegSeat(st, ch, d) || null;
        eq(got, want[key] || null, `seat: ${key}`);
        if (got) named++; else empty++;
        if (vacant.has(key)) eq(got, null, `seat: ${key} is vacant on the official roster and was filled`);
      }
    }
  }
  eq(named + empty, 643, "seat: the six chambers do not add up to 643 seats");
  eq(named, REC.rows.length + REC.alreadyHeld.length + REC.districtSet.length, "seat: named seats do not match the record");
  const KEYS = JSON.stringify(["name", "office", "state", "district", "candidate", "score", "kept", "broken", "pending", "icon", "issues"]);
  for (const r of REC.rows) {
    const rec = W.CMP_DATA[r.pid];
    if (!ok(rec, `shell: ${r.pid} is not in cmp-data.js`)) continue;
    eq(JSON.stringify(Object.keys(rec)), KEYS, `shell: ${r.pid} carries more than identity`);
    eq(rec.candidate, false, `shell: ${r.pid} is not marked in office`);
    eq(rec.state, r.state, `shell: ${r.pid}'s state`);
    eq(rec.name, r.name, `shell: ${r.pid}'s name`);
    ok(/\bstate\b/i.test(rec.office) && rec.office.indexOf(r.state) === 0, `shell: ${r.pid}'s office (${rec.office}) does not name its state chamber`);
    eq(String(rec.district).replace(/[^0-9]/g, ""), String(r.district), `shell: ${r.pid}'s district`);
    eq(rec.score, null, `shell: ${r.pid} carries a score`);
    eq(rec.issues.length, 0, `shell: ${r.pid} carries issues`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the other 47 states and D.C. are identical to HEAD's");
// ═════════════════════════════════════════════════════════════════════════════
{
  const headData = HEAD("cmp-data.js");
  must(headData, "no git baseline for cmp-data.js");
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts",
    "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
    "District of Columbia"];
  eq(STATES.length, 48, "fixture: not 47 states and D.C.");
  const now = boot(at("Utah", "Layton", "Davis County", "2", "7", "16"));
  const was = boot(at("Utah", "Layton", "Davis County", "2", "7", "16"), { "cmp-data.js": headData });
  const ctx = (src) => { const w = {}; w.window = w; vm.createContext(w); vm.runInContext(src, w); return w.CMP_DATA; };
  const A = ctx(R("cmp-data.js")), B = ctx(headData);
  const OURS = /^(New York|Pennsylvania|Illinois)\b/;
  const outside = (T) => Object.keys(T).filter((k) => !OURS.test(String(T[k].state || ""))).sort();
  eq(JSON.stringify(outside(A)), JSON.stringify(outside(B)), "roster: rows outside the three states were added or removed");
  for (const k of outside(B)) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) ok(false, `roster: ${k} changed`);
  const pick = (r) => JSON.stringify([r.legislativeMapped, r.levels.map((l) => [l.key, l.district, l.pid, l.mapped])]);
  for (const st of STATES) {
    for (const d of ["1", "2", "7", "16", "26", "40"]) {
      const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: d, stateHouseDistrict: d, mapSelected: true };
      now._currentVoterLocation = Object.assign({}, loc);
      was._currentVoterLocation = Object.assign({}, loc);
      eq(pick(now.pdxRepsForMe()), pick(was.pdxRepsForMe()), `${st} seat ${d}: the resolver's answer changed`);
    }
  }
  // The California, Texas and Florida shells: the block itself, byte for byte.
  const BANNER = "// ── Sitting state legislators, California, Texas and Florida — roster shells (Oct 2026)";
  const block = (s) => { const i = s.indexOf(BANNER); return i < 0 ? null : s.slice(i, s.indexOf("\n// ── ", i + BANNER.length)); };
  ok(block(headData) !== null, "fixture: HEAD carries no California, Texas and Florida block");
  eq(block(R("cmp-data.js")), block(headData), "roster: the California, Texas and Florida shells moved");
  eq(R("db/roster-state-legislators-ca-tx-fl-2026-oct.json"), HEAD("db/roster-state-legislators-ca-tx-fl-2026-oct.json"),
    "record: the California, Texas and Florida record moved");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no equity language, and the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["cmp-data.js", "sw.js"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  ok(!EQUITY.test(R("db/roster-state-legislators-ny-pa-il-2026-oct.json")), "record: carries equity language");
  const v = Number((R("sw.js").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  const v0 = Number(((HEAD("sw.js") || "").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  has(R("sw.js"), "'/cmp-data.js',", "sw: cmp-data.js is no longer precached");
  if (R("cmp-data.js") !== HEAD("cmp-data.js")) ok(v === v0 + 1, `sw: cmp-data.js changed and CACHE_VERSION moved from v${v0} to v${v}`);
}

console.log("");
if (failures.length) {
  failures.slice(0, 60).forEach((f) => console.error(`  ✗ ${f}`));
  console.error(`\n✗ ny/pa/il legislator shells: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ ny/pa/il legislator shells: ${passed} passed — a sitting member only where the official roster seats them, every other state unchanged`);
