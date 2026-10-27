#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislator-shells-wa-az-ma.mjs — sitting Washington, Arizona and
// Massachusetts state legislators, named on the seat card
// ─────────────────────────────────────────────────────────────────────────────
// cmp-data.js carries a thin roster shell — name, office, state, exact district,
// `candidate: false` — for every member each chamber's official sources listed
// as seated on the read date, and db/roster-state-legislators-wa-az-ma-2026-oct.json
// is the record of what was read, what was vacant, and which seats were left
// empty. Washington's and Arizona's Houses have no rows: each legislative
// district elects two Representatives, and the resolver names nobody for a seat
// two records claim. Massachusetts names its districts, so its shells carry the
// name and the resolver turns it into the seat's key.
//
// What it pins:
//
//   1. A WASHINGTON, ARIZONA AND MASSACHUSETTS ADDRESS whose resolved seats have
//      a shell names that person on the card.
//   2. A SEAT WITH NO SHELL (a Washington or Arizona House seat; a vacant
//      Massachusetts House seat; a shared display name) still reads
//      "District N — no member on file yet" (a Massachusetts seat by its name).
//   3. EVERY SEAT IN ALL SIX CHAMBERS names exactly the record's pid or nobody,
//      every shell is identity-only, and no Washington or Arizona House seat is
//      named.
//   4. THE OTHER 47 STATES AND D.C. are identical to HEAD's resolver, and the
//      twelve earlier states' shells are byte-identical to HEAD's.
//   5. NO EQUITY LANGUAGE, and the shell moved because cmp-data.js did.
//
//   node scripts/test-state-legislator-shells-wa-az-ma.mjs

import { R, HEAD, boot, levelOf, band } from "./state-leg-harness.mjs";
import vm from "node:vm";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ wa/az/ma legislator shells: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

const REC = JSON.parse(R("db/roster-state-legislators-wa-az-ma-2026-oct.json"));
must(REC.rows && REC.rows.length > 250, "the record lists no shells");
must(HEAD("cmp-data.js"), "no git baseline for cmp-data.js");
const CH = { "State Senate": "statesenate", "State House": "statehouse" };

const at = (state, city, county, cd, sd, hd) => ({ state, city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const noMember = (label) => `${label} — no member on file yet`;
const count = (h, n) => String(h).split(n).length - 1;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · an address in each state names the member of each seat it resolved");
// ═════════════════════════════════════════════════════════════════════════════
// Real places, and the seats TIGERweb's 2024 layers (5, 6) draw them into. A
// Massachusetts seat's number is the resolver's key for the district's name:
// Third Suffolk is Senate key 25, 8th Suffolk is House key 130.
{
  const B = boot(at("Massachusetts", "Boston", "Suffolk County", "8", "25", "130"));
  must(typeof B._pdxStateLegSeat === "function", "the resolver did not load");
  eq(levelOf(B, "statesenate").pid, "edwards_ma", "Massachusetts Third Suffolk: its senator was not named");
  eq(levelOf(B, "statehouse").pid, "livingstone_ma", "Massachusetts 8th Suffolk: its representative was not named");
  eq(B.CMP_DATA.edwards_ma.name, "Lydia Edwards", "Massachusetts: senate fixture name drifted");
  eq(B.CMP_DATA.livingstone_ma.name, "Jay Livingstone", "Massachusetts: house fixture name drifted");
  eq(B.pdxLegDistrictName("Massachusetts", "statesenate", 25), "Third Suffolk District", "Massachusetts: Senate key 25 is not Third Suffolk");
  eq(B.pdxLegDistrictName("Massachusetts", "statehouse", 130), "8th Suffolk District", "Massachusetts: House key 130 is not 8th Suffolk");
  const out = band(B);
  has(out, "Lydia Edwards", "Massachusetts: the State Senate member is not on the card");
  has(out, "Jay Livingstone", "Massachusetts: the State House member is not on the card");
  eq(count(out, "no member on file yet"), 0, "Massachusetts: a named seat still says nobody is on file");
  eq(B.pdxSeatClaim("edwards_ma", "statesenate", "25") === "mismatch", false, "Massachusetts: edwards_ma contradicts its seat");
}
for (const [loc, sp, sn] of [
  [at("Washington", "Olympia", "Thurston County", "10", "22", "22"), "bateman_wa", "Jessica Bateman"],
  [at("Arizona", "Phoenix", "Maricopa County", "3", "11", "11"), "miranda_az", "Catherine Miranda"],
]) {
  const W = boot(Object.assign({}, loc));
  eq(levelOf(W, "statesenate").pid, sp, `${loc.state}: LD ${loc.stateSenateDistrict}'s senator was not named`);
  eq(W.CMP_DATA[sp].name, sn, `${loc.state}: senate fixture name drifted`);
  const out = band(W);
  has(out, sn, `${loc.state}: the State Senate member is not on the card`);
  // Both chambers share the number; only the House row says nobody is on file.
  eq(count(out, noMember(`District ${loc.stateHouseDistrict}`)), 1, `${loc.state}: the named State Senate seat still says nobody is on file`);
  eq(W.pdxSeatClaim(sp, "statesenate", loc.stateSenateDistrict) === "mismatch", false, `${loc.state}: ${sp} contradicts its seat`);
}
{
  // Leaders already on file, now carrying the district the official source gives.
  const M = boot(at("Massachusetts", "Braintree", "Norfolk County", "8", "13", "98"));
  eq(M.pdxLegDistrictName("Massachusetts", "statesenate", 13), "Middlesex and Norfolk District", "fixture: Senate key 13 moved");
  eq(M.pdxLegDistrictName("Massachusetts", "statehouse", 98), "3rd Norfolk District", "fixture: House key 98 moved");
  eq(levelOf(M, "statesenate").pid, "karen_spilka", "Massachusetts Middlesex and Norfolk: the Senate President's existing record is not the one named");
  eq(levelOf(M, "statehouse").pid, "ron_mariano", "Massachusetts 3rd Norfolk: the Speaker's existing record is not the one named");
  const A = boot(at("Arizona", "Phoenix", "Maricopa County", "5", "14", "14"));
  eq(levelOf(A, "statesenate").pid, "warren_petersen", "Arizona LD 14: the Senate President's existing record is not the one named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a seat with no shell still says nobody is on file");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Lowell: 17th Middlesex is vacant on the Massachusetts House's own roster.
  const L = boot(at("Massachusetts", "Lowell", "Middlesex County", "3", "11", "75"));
  eq(L.pdxLegDistrictName("Massachusetts", "statehouse", 75), "17th Middlesex District", "fixture: House key 75 moved");
  eq(levelOf(L, "statehouse").pid, null, "Massachusetts 17th Middlesex (vacant): a member was named");
  eq(levelOf(L, "statesenate").pid, "howard_ma", "Massachusetts First Middlesex: its senator was not named");
  has(band(L), noMember("17th Middlesex District"), "Massachusetts 17th Middlesex: the row does not say nobody is on file");
  // Washington and Arizona House seats, and Washington LD 19's Senate seat.
  for (const [st, ch, d, why] of [["Washington", "statehouse", "22", "two-member House district"], ["Arizona", "statehouse", "11", "two-member House district"],
                                  ["Washington", "statesenate", "19", "shared display name"]]) {
    const W = boot(at(st, "", "", "1", ch === "statesenate" ? d : "1", ch === "statehouse" ? d : "2"));
    eq(levelOf(W, ch).pid, null, `${st} ${ch} ${d} (${why}): a member was named`);
    has(band(W), noMember(`District ${d}`), `${st} ${ch} ${d}: the row does not say nobody is on file`);
  }
  for (const r of REC.nameSharedWithAnotherRecord) ok(!REC.rows.some((x) => x.name === r.name), `record: ${r.name} has a shell and is also listed as a shared name`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every seat in all six chambers names the record's pid or nobody");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = boot(at("Massachusetts", "Boston", "Suffolk County", "8", "25", "130"));
  const want = {};
  for (const r of [...REC.rows, ...REC.alreadyHeld, ...REC.districtSet]) want[`${r.state}|${CH[r.chamber]}|${r.district}`] = r.pid;
  const vacant = new Set(REC.vacant.Massachusetts.statehouse.map((n) => n + " District"));
  const SIZE = { Washington: [49, 49], Arizona: [30, 30], Massachusetts: [40, 160] };
  let named = 0, empty = 0;
  for (const [st, [nSen, nLow]] of Object.entries(SIZE)) {
    for (const [ch, max] of [["statesenate", nSen], ["statehouse", nLow]]) {
      for (let d = 1; d <= max; d++) {
        const key = `${st}|${ch}|${d}`;
        const got = W._pdxStateLegSeat(st, ch, d) || null;
        eq(got, want[key] || null, `seat: ${key}`);
        if (got) named++; else empty++;
        if (st !== "Massachusetts" && ch === "statehouse") eq(got, null, `seat: ${st} House ${d} named somebody`);
        if (st === "Massachusetts" && vacant.has(W.pdxLegDistrictName(st, ch, d)) && ch === "statehouse") eq(got, null, `seat: ${key} is vacant and was filled`);
      }
    }
  }
  eq(named + empty, 358, "seat: the six chambers do not add up to 358 seats");
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
    if (r.districtName) eq(rec.district, r.districtName, `shell: ${r.pid}'s district name`);
    else eq(String(rec.district).replace(/[^0-9]/g, ""), String(r.district), `shell: ${r.pid}'s district`);
    eq(rec.score, null, `shell: ${r.pid} carries a score`);
    eq(rec.issues.length, 0, `shell: ${r.pid} carries issues`);
  }
  ok(!REC.rows.some((r) => r.state !== "Massachusetts" && r.chamber === "State House"), "record: a Washington or Arizona House shell was added");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the other 47 states and D.C. are identical to HEAD's");
// ═════════════════════════════════════════════════════════════════════════════
{
  const headData = HEAD("cmp-data.js");
  const STATES = ["Alabama", "Alaska", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "West Virginia", "Wisconsin",
    "Wyoming", "District of Columbia"];
  eq(STATES.length, 48, "fixture: not 47 states and D.C.");
  // Tennessee, Indiana and Missouri moved in their own later pass
  // (test-state-legislator-shells-tn-in-mo.mjs holds them), so they are set aside here.
  const LATER = new Set(["Tennessee", "Indiana", "Missouri", "Wisconsin", "Minnesota", "Colorado", "Nevada"]);
  for (let i = STATES.length - 1; i >= 0; i--) if (LATER.has(STATES[i])) STATES.splice(i, 1);
  eq(STATES.length, 41, "fixture: the later passes' states are not all on the list");
  const now = boot(at("Utah", "Layton", "Davis County", "2", "7", "16"));
  const was = boot(at("Utah", "Layton", "Davis County", "2", "7", "16"), { "cmp-data.js": headData });
  const ctx = (src) => { const w = {}; w.window = w; vm.createContext(w); vm.runInContext(src, w); return w.CMP_DATA; };
  const A = ctx(R("cmp-data.js")), B = ctx(headData);
  const OURS = /^(Washington|Arizona|Massachusetts|Tennessee|Indiana|Missouri|Wisconsin|Minnesota|Colorado|Nevada)\b/;
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
  // The twelve earlier states' shells: each block itself, and its record, byte for byte.
  for (const [banner, file] of [
    ["// ── Sitting state legislators, California, Texas and Florida — roster shells (Oct 2026)", "db/roster-state-legislators-ca-tx-fl-2026-oct.json"],
    ["// ── Sitting state legislators, New York, Pennsylvania and Illinois — roster shells (Oct 2026)", "db/roster-state-legislators-ny-pa-il-2026-oct.json"],
    ["// ── Sitting state legislators, Ohio, Georgia and North Carolina — roster shells (Oct 2026)", "db/roster-state-legislators-oh-ga-nc-2026-oct.json"],
    ["// ── Sitting state legislators, Michigan, New Jersey and Virginia — roster shells (Oct 2026)", "db/roster-state-legislators-mi-nj-va-2026-oct.json"],
  ]) {
    const block = (s) => { const i = s.indexOf(banner); return i < 0 ? null : s.slice(i, s.indexOf("\n// ── ", i + banner.length)); };
    ok(block(headData) !== null, `fixture: HEAD carries no block for ${file}`);
    eq(block(R("cmp-data.js")), block(headData), `roster: the shells in ${file} moved`);
    eq(R(file), HEAD(file), `record: ${file} moved`);
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
  ok(!EQUITY.test(R("db/roster-state-legislators-wa-az-ma-2026-oct.json")), "record: carries equity language");
  const v = Number((R("sw.js").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  const v0 = Number(((HEAD("sw.js") || "").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  has(R("sw.js"), "'/cmp-data.js',", "sw: cmp-data.js is no longer precached");
  if (R("cmp-data.js") !== HEAD("cmp-data.js")) ok(v === v0 + 1, `sw: cmp-data.js changed and CACHE_VERSION moved from v${v0} to v${v}`);
}

console.log("");
if (failures.length) {
  failures.slice(0, 60).forEach((f) => console.error(`  ✗ ${f}`));
  console.error(`\n✗ wa/az/ma legislator shells: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ wa/az/ma legislator shells: ${passed} passed — a sitting member only where the official roster seats them, every other state unchanged`);
