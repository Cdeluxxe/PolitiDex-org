#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislator-shells-ca-tx-fl.mjs — sitting California, Texas and
// Florida state legislators, named on the seat card
// ─────────────────────────────────────────────────────────────────────────────
// cmp-data.js carries a thin roster shell — name, office, state, exact district,
// `candidate: false` — for every member the chamber's official roster listed as
// seated on the read date, and db/roster-state-legislators-ca-tx-fl-2026-oct.json
// is the record of what was read, what was vacant, and which seats were left
// empty because the member is already on file under another id.
//
// What it pins:
//
//   1. A CALIFORNIA, TEXAS AND FLORIDA ADDRESS whose resolved seats have a shell
//      names that person on the card, in both chambers.
//   2. A SEAT WITH NO SHELL (a vacancy, or a member held only as a candidate
//      row) still reads "District N — no member on file yet".
//   3. EVERY SEAT IN ALL SIX CHAMBERS names exactly the record's pid or nobody,
//      and every shell is identity-only and claims the seat it is placed in.
//   4. THE OTHER 47 STATES AND D.C. are identical to HEAD's resolver.
//   5. NO EQUITY LANGUAGE, and the shell moved because cmp-data.js did.
//
//   node scripts/test-state-legislator-shells-ca-tx-fl.mjs

import { R, HEAD, boot, levelOf, band } from "./state-leg-harness.mjs";
import vm from "node:vm";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ ca/tx/fl legislator shells: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

const REC = JSON.parse(R("db/roster-state-legislators-ca-tx-fl-2026-oct.json"));
must(REC.rows && REC.rows.length > 400, "the record lists no shells");
const CH = { "State Senate": "statesenate", "State House": "statehouse" };

const at = (state, city, county, cd, sd, hd) => ({ state, city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });

// ═════════════════════════════════════════════════════════════════════════════
section("1 · an address in each state names the member of each seat it resolved");
// ═════════════════════════════════════════════════════════════════════════════
// Real places, and the seats TIGERweb's 2024 layers draw them into.
const NAMED = [
  // [location, senate pid, senate name, lower pid, lower name]
  [at("California", "San Francisco", "San Francisco County", "11", "11", "17"), "wiener_ca", "Scott Wiener", "haney_ca", "Matt Haney"],
  [at("Texas", "Fort Worth", "Tarrant County", "12", "10", "95"), "phil_king_tx", "Phil King", "collier_tx", "Nicole Collier"],
  [at("Florida", "Aventura", "Miami-Dade County", "24", "37", "106"), "pizzo_fl", "Jason Pizzo", "basabe_fl", "Fabián Basabe"],
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
  lacks(out, "no member on file yet", `${loc.state}: a named seat still says nobody is on file`);
  eq(W.pdxSeatClaim(sp, "statesenate", loc.stateSenateDistrict) === "mismatch", false, `${loc.state}: ${sp} contradicts its seat`);
  eq(W.pdxSeatClaim(lp, "statehouse", loc.stateHouseDistrict) === "mismatch", false, `${loc.state}: ${lp} contradicts its seat`);
}
{
  // A leader already on file, now carrying the district the official roster gives.
  const W = boot(at("Texas", "Lubbock", "Lubbock County", "19", "28", "83"));
  eq(levelOf(W, "statehouse").pid, "dustin_burrows", "Texas HD 83: the Speaker's existing record is not the one named");
  eq(levelOf(W, "statesenate").pid, "perry_tx", "Texas SD 28: its member was not named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a seat with no shell still says nobody is on file");
// ═════════════════════════════════════════════════════════════════════════════
const EMPTY = [
  // [location, chamber, district, why]
  [at("Texas", "Weatherford", "Parker County", "25", "22", "60"), "statesenate", "22", "vacant on the official roster"],
  [at("Florida", "Doral", "Miami-Dade County", "26", "39", "116"), "statehouse", "116", "vacant on the official roster"],
  [at("California", "Davis", "Yolo County", "4", "10", "3"), "statehouse", "3", "vacant on the official roster"],
  [at("Texas", "Austin", "Travis County", "37", "14", "50"), "statehouse", "50", "member on file only as a candidate row"],
  [at("California", "West Hollywood", "Los Angeles County", "36", "24", "50"), "statehouse", "50", "member shares a display name with another record"],
];
for (const [loc, ch, d, why] of EMPTY) {
  const W = boot(Object.assign({}, loc));
  eq(levelOf(W, ch).pid, null, `${loc.state} ${ch} ${d} (${why}): a member was named`);
  has(band(W), `District ${d} — no member on file yet`, `${loc.state} ${ch} ${d}: the row does not say nobody is on file`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every seat in all six chambers names the record's pid or nobody");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = boot(at("California", "Sacramento", "Sacramento County", "7", "1", "1"));
  const want = {};
  for (const r of [...REC.rows, ...REC.alreadyHeld, ...REC.districtSet]) want[`${r.state}|${CH[r.chamber]}|${r.district}`] = r.pid;
  const vacant = new Set();
  for (const st in REC.vacant) for (const ch in REC.vacant[st]) for (const d of REC.vacant[st][ch]) vacant.add(`${st}|${ch}|${d}`);
  for (const r of REC.onFileAsCandidate) {
    ok(W.CMP_DATA[r.pid] && W.CMP_DATA[r.pid].candidate === true, `record: ${r.pid} is not a candidate row`);
    ok(!want[`${r.state}|${CH[r.chamber]}|${r.district}`], `record: ${r.pid}'s seat was given a shell as well`);
  }
  const SIZE = { California: [40, 80], Texas: [31, 150], Florida: [40, 120] };
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
  eq(named + empty, 461, "seat: the six chambers do not add up to 461 seats");
  eq(named, REC.rows.length + REC.alreadyHeld.length + REC.districtSet.length, "seat: named seats do not match the record");
  // Every shell is identity-only and claims its own seat.
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
  eq(W.CMP_DATA.limon_ca.district, "SD 21", "limon_ca: still filed in SD 19");
  eq(W._pdxStateLegSeat("California", "statesenate", 19), "ochoa_bogh_ca", "California SD 19: not its member");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · every state but these three, and the later pass's three, is identical to HEAD's");
// ═════════════════════════════════════════════════════════════════════════════
{
  const headData = HEAD("cmp-data.js");
  must(headData, "no git baseline for cmp-data.js");
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "Colorado", "Connecticut", "Delaware", "Georgia", "Hawaii", "Idaho",
    "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
    "District of Columbia"];
  // New York, Pennsylvania and Illinois moved in their own later pass
  // (test-state-legislator-shells-ny-pa-il.mjs holds them), so they are set aside here.
  eq(STATES.length, 45, "fixture: the state list moved");
  // Ohio, Georgia and North Carolina, and Michigan, New Jersey and Virginia, moved
  // in their own later passes (test-state-legislator-shells-oh-ga-nc.mjs and
  // test-state-legislator-shells-mi-nj-va.mjs hold them), so they are set aside here.
  const LATER = new Set(["Ohio", "Georgia", "North Carolina", "Michigan", "New Jersey", "Virginia", "Washington", "Arizona", "Massachusetts", "Tennessee", "Indiana", "Missouri", "Wisconsin", "Minnesota", "Colorado"]);
  for (let i = STATES.length - 1; i >= 0; i--) if (LATER.has(STATES[i])) STATES.splice(i, 1);
  eq(STATES.length, 30, "fixture: the later passes' states are not all on the list");
  const now = boot(at("Utah", "Layton", "Davis County", "2", "7", "16"));
  const was = boot(at("Utah", "Layton", "Davis County", "2", "7", "16"), { "cmp-data.js": headData });
  // Every non-CA/TX/FL roster row is byte-identical.
  const ctx = (src) => { const w = { }; w.window = w; vm.createContext(w); vm.runInContext(src, w); return w.CMP_DATA; };
  const A = ctx(R("cmp-data.js")), B = ctx(headData);
  const OURS = /^(California|Texas|Florida|New York|Pennsylvania|Illinois|Ohio|Georgia|North Carolina|Michigan|New Jersey|Virginia|Washington|Arizona|Massachusetts|Tennessee|Indiana|Missouri|Wisconsin|Minnesota|Colorado)\b/;
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
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no equity language, and the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["cmp-data.js", "sw.js"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  ok(!EQUITY.test(R("db/roster-state-legislators-ca-tx-fl-2026-oct.json")), "record: carries equity language");
  const v = Number((R("sw.js").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  const v0 = Number(((HEAD("sw.js") || "").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  has(R("sw.js"), "'/cmp-data.js',", "sw: cmp-data.js is no longer precached");
  if (R("cmp-data.js") !== HEAD("cmp-data.js")) ok(v === v0 + 1, `sw: cmp-data.js changed and CACHE_VERSION moved from v${v0} to v${v}`);
}

console.log("");
if (failures.length) {
  failures.slice(0, 60).forEach((f) => console.error(`  ✗ ${f}`));
  console.error(`\n✗ ca/tx/fl legislator shells: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ ca/tx/fl legislator shells: ${passed} passed — a sitting member only where the official roster seats them, every other state unchanged`);
