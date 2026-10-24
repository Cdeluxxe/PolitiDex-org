#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislator-shells-oh-ga-nc.mjs — sitting Ohio, Georgia and North
// Carolina state legislators, named on the seat card
// ─────────────────────────────────────────────────────────────────────────────
// cmp-data.js carries a thin roster shell — name, office, state, exact district,
// `candidate: false` — for every member the chamber's official roster listed as
// seated on the read date, and db/roster-state-legislators-oh-ga-nc-2026-oct.json
// is the record of what was read, what was vacant, and which seats were left
// empty because the member is already on file under another id or shares a
// display name with another record.
//
// What it pins:
//
//   1. AN OHIO, GEORGIA AND NORTH CAROLINA ADDRESS whose resolved seats have a
//      shell names that person on the card, in both chambers.
//   2. A SEAT WITH NO SHELL (Ohio SD 13 and HD 89, vacant; a member held only as
//      a candidate row; a shared display name) still reads "District N — no
//      member on file yet".
//   3. EVERY SEAT IN ALL SIX CHAMBERS names exactly the record's pid or nobody,
//      and every shell is identity-only and claims the seat it is placed in.
//   4. THE OTHER 47 STATES AND D.C. are identical to HEAD's resolver, and the
//      six earlier states' shells are byte-identical to HEAD's.
//   5. NO EQUITY LANGUAGE, and the shell moved because cmp-data.js did.
//
//   node scripts/test-state-legislator-shells-oh-ga-nc.mjs

import { R, HEAD, boot, levelOf, band } from "./state-leg-harness.mjs";
import vm from "node:vm";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ oh/ga/nc legislator shells: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

const REC = JSON.parse(R("db/roster-state-legislators-oh-ga-nc-2026-oct.json"));
must(REC.rows && REC.rows.length > 500, "the record lists no shells");
const CH = { "State Senate": "statesenate", "State House": "statehouse" };

const at = (state, city, county, cd, sd, hd) => ({ state, city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });

// ═════════════════════════════════════════════════════════════════════════════
section("1 · an address in each state names the member of each seat it resolved");
// ═════════════════════════════════════════════════════════════════════════════
// Real places, and the seats TIGERweb's 2024 layers (5, 6) draw them into.
const NAMED = [
  // [location, senate pid, senate name, lower pid, lower name]
  [at("Ohio", "Columbus", "Franklin County", "15", "15", "1"), "hearcel_craig_oh", "Hearcel F. Craig", "jarrells_oh", "Dontavius L. Jarrells"],
  [at("Georgia", "Atlanta", "Fulton County", "5", "36", "58"), "orrock_ga", "Nan Orrock", "park_cannon_ga", "Park Cannon"],
  [at("North Carolina", "Raleigh", "Wake County", "2", "14", "38"), "blue_nc", "Dan Blue", "abe_jones_nc", "Abe Jones"],
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
  const O = boot(at("Ohio", "Defiance", "Defiance County", "5", "1", "78"));
  eq(levelOf(O, "statesenate").pid, "rob_mccolley", "Ohio SD 1: the Senate President's existing record is not the one named");
  eq(levelOf(O, "statehouse").pid, "matt_huffman", "Ohio HD 78: the Speaker's existing record is not the one named");
  const N = boot(at("North Carolina", "Eden", "Rockingham County", "6", "26", "87"));
  eq(levelOf(N, "statesenate").pid, "phil_berger", "North Carolina SD 26: the President pro Tem's existing record is not the one named");
  eq(levelOf(N, "statehouse").pid, "destin_hall", "North Carolina HD 87: the Speaker's existing record is not the one named");
  const G = boot(at("Georgia", "Jefferson", "Jackson County", "10", "47", "159"));
  eq(levelOf(G, "statehouse").pid, "jon_burns", "Georgia HD 159: the Speaker's existing record is not the one named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a seat with no shell still says nobody is on file");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Elyria: SD 13 is vacant on the Ohio Senate's own roster. Sandusky: HD 89 is
  // vacant on the Ohio House's.
  const E = boot(at("Ohio", "Elyria", "Lorain County", "5", "13", "52"));
  eq(levelOf(E, "statesenate").pid, null, "Ohio SD 13 (vacant): a member was named");
  has(band(E), "District 13 — no member on file yet", "Ohio SD 13: the row does not say nobody is on file");
  const S = boot(at("Ohio", "Sandusky", "Erie County", "9", "2", "89"));
  eq(levelOf(S, "statehouse").pid, null, "Ohio HD 89 (vacant): a member was named");
  eq(levelOf(S, "statesenate").pid, "theresa_gavarone", "Ohio SD 2: its existing record stopped naming its member");
  has(band(S), "District 89 — no member on file yet", "Ohio HD 89: the row does not say nobody is on file");
  // A member held only as a candidate row, and a display name another record carries.
  for (const [st, ch, d, why] of [["Georgia", "statehouse", "108", "candidate row only"], ["Georgia", "statehouse", "138", "shared display name"],
                                  ["North Carolina", "statehouse", "113", "shared display name"], ["Ohio", "statehouse", "92", "shared display name"]]) {
    const W = boot(at(st, "", "", "1", "1", d));
    eq(levelOf(W, ch).pid, null, `${st} ${ch} ${d} (${why}): a member was named`);
    has(band(W), `District ${d} — no member on file yet`, `${st} ${ch} ${d}: the row does not say nobody is on file`);
  }
  for (const r of REC.nameSharedWithAnotherRecord) ok(!REC.rows.some((x) => x.name === r.name), `record: ${r.name} has a shell and is also listed as a shared name`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every seat in all six chambers names the record's pid or nobody");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = boot(at("Ohio", "Columbus", "Franklin County", "15", "15", "1"));
  const want = {};
  for (const r of [...REC.rows, ...REC.alreadyHeld, ...REC.districtSet]) want[`${r.state}|${CH[r.chamber]}|${r.district}`] = r.pid;
  const vacant = new Set();
  for (const st in REC.vacant) for (const ch in REC.vacant[st]) for (const d of REC.vacant[st][ch]) vacant.add(`${st}|${ch}|${d}`);
  for (const r of REC.onFileAsCandidate) {
    ok(W.CMP_DATA[r.pid] && W.CMP_DATA[r.pid].candidate === true, `record: ${r.pid} is not a candidate row`);
    ok(!want[`${r.state}|${CH[r.chamber]}|${r.district}`], `record: ${r.pid}'s seat was given a shell as well`);
  }
  const SIZE = { Ohio: [33, 99], Georgia: [56, 180], "North Carolina": [50, 120] };
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
  eq(named + empty, 538, "seat: the six chambers do not add up to 538 seats");
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
    "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts",
    "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Dakota", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
    "District of Columbia"];
  eq(STATES.length, 48, "fixture: not 47 states and D.C.");
  // Michigan, New Jersey and Virginia moved in their own later pass
  // (test-state-legislator-shells-mi-nj-va.mjs holds them), so they are set aside here.
  const LATER = new Set(["Michigan", "New Jersey", "Virginia", "Washington", "Arizona", "Massachusetts"]);
  for (let i = STATES.length - 1; i >= 0; i--) if (LATER.has(STATES[i])) STATES.splice(i, 1);
  eq(STATES.length, 42, "fixture: the later passes' states are not all on the list");
  const now = boot(at("Utah", "Layton", "Davis County", "2", "7", "16"));
  const was = boot(at("Utah", "Layton", "Davis County", "2", "7", "16"), { "cmp-data.js": headData });
  const ctx = (src) => { const w = {}; w.window = w; vm.createContext(w); vm.runInContext(src, w); return w.CMP_DATA; };
  const A = ctx(R("cmp-data.js")), B = ctx(headData);
  const OURS = /^(Ohio|Georgia|North Carolina|Michigan|New Jersey|Virginia|Washington|Arizona|Massachusetts)\b/;
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
  // The six earlier states' shells: each block itself, and its record, byte for byte.
  for (const [banner, file] of [
    ["// ── Sitting state legislators, California, Texas and Florida — roster shells (Oct 2026)", "db/roster-state-legislators-ca-tx-fl-2026-oct.json"],
    ["// ── Sitting state legislators, New York, Pennsylvania and Illinois — roster shells (Oct 2026)", "db/roster-state-legislators-ny-pa-il-2026-oct.json"],
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
  ok(!EQUITY.test(R("db/roster-state-legislators-oh-ga-nc-2026-oct.json")), "record: carries equity language");
  const v = Number((R("sw.js").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  const v0 = Number(((HEAD("sw.js") || "").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  has(R("sw.js"), "'/cmp-data.js',", "sw: cmp-data.js is no longer precached");
  if (R("cmp-data.js") !== HEAD("cmp-data.js")) ok(v === v0 + 1, `sw: cmp-data.js changed and CACHE_VERSION moved from v${v0} to v${v}`);
}

console.log("");
if (failures.length) {
  failures.slice(0, 60).forEach((f) => console.error(`  ✗ ${f}`));
  console.error(`\n✗ oh/ga/nc legislator shells: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ oh/ga/nc legislator shells: ${passed} passed — a sitting member only where the official roster seats them, every other state unchanged`);
