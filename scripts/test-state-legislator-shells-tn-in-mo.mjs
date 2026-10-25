#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislator-shells-tn-in-mo.mjs — sitting Tennessee, Indiana and
// Missouri state legislators, named on the seat card
// ─────────────────────────────────────────────────────────────────────────────
// cmp-data.js carries a thin roster shell — name, office, state, exact district,
// `candidate: false` — for every member official legislative sources listed as
// seated on the read date, and db/roster-state-legislators-tn-in-mo-2026-oct.json
// is the record of what was read, what was vacant, and which seats were left
// empty. All six chambers elect one member per district. Indiana was read from
// its four legislative caucuses' member lists, kept only where they name exactly
// one member for the seat.
//
// What it pins:
//
//   1. A TENNESSEE, INDIANA AND MISSOURI ADDRESS whose resolved seats have a
//      shell names that person on the card, in both chambers.
//   2. A SEAT WITH NO SHELL (a vacancy; an Indiana seat neither caucus lists; a
//      member held only as a candidate row; a shared display name) still reads
//      "District N — no member on file yet".
//   3. EVERY SEAT IN ALL SIX CHAMBERS names exactly the record's pid or nobody,
//      and every shell is identity-only.
//   4. THE OTHER 47 STATES AND D.C. are identical to HEAD's resolver, and the
//      fifteen earlier states' shells are byte-identical to HEAD's.
//   5. NO EQUITY LANGUAGE, and the shell moved because cmp-data.js did.
//
//   node scripts/test-state-legislator-shells-tn-in-mo.mjs

import { R, HEAD, boot, levelOf, band } from "./state-leg-harness.mjs";
import vm from "node:vm";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ tn/in/mo legislator shells: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

const REC = JSON.parse(R("db/roster-state-legislators-tn-in-mo-2026-oct.json"));
must(REC.rows && REC.rows.length > 400, "the record lists no shells");
must(HEAD("cmp-data.js"), "no git baseline for cmp-data.js");
const CH = { "State Senate": "statesenate", "State House": "statehouse" };

const at = (state, city, county, cd, sd, hd) => ({ state, city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const noMember = (d) => `District ${d} — no member on file yet`;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · an address in each state names the member of each seat it resolved");
// ═════════════════════════════════════════════════════════════════════════════
// Real places, and the seats TIGERweb's 2024 layers (5, 6) draw them into.
const NAMED = [
  // [location, senate pid, senate name, lower pid, lower name]
  [at("Tennessee", "Nashville", "Davidson County", "7", "21", "51"), "yarbro_tn", "Jeff Yarbro", "behn_tn", "Aftyn Behn"],
  [at("Indiana", "Indianapolis", "Marion County", "7", "46", "97"), "hunley_in", "Andrea Hunley", "moed_in", "Justin Moed"],
  [at("Missouri", "Jefferson City", "Cole County", "3", "6", "60"), "bernskoetter_mo", "Mike Bernskoetter", "griffith_mo", "Dave Griffith"],
];
for (const [loc, sp, sn, lp, ln] of NAMED) {
  const W = boot(Object.assign({}, loc));
  must(typeof W._pdxStateLegSeat === "function", "the resolver did not load");
  const ss = levelOf(W, "statesenate"), sh = levelOf(W, "statehouse");
  eq(ss && ss.pid, sp, `${loc.state}: SD ${loc.stateSenateDistrict} did not name its member`);
  eq(sh && sh.pid, lp, `${loc.state}: HD ${loc.stateHouseDistrict} did not name its member`);
  eq(W.CMP_DATA[sp].name, sn, `${loc.state}: senate fixture name drifted`);
  eq(W.CMP_DATA[lp].name, ln, `${loc.state}: house fixture name drifted`);
  const out = band(W);
  has(out, sn, `${loc.state}: the State Senate member is not on the card`);
  has(out, ln, `${loc.state}: the State House member is not on the card`);
  lacks(out, noMember(loc.stateSenateDistrict), `${loc.state}: the named State Senate seat still says nobody is on file`);
  lacks(out, noMember(loc.stateHouseDistrict), `${loc.state}: the named State House seat still says nobody is on file`);
  eq(W.pdxSeatClaim(sp, "statesenate", loc.stateSenateDistrict) === "mismatch", false, `${loc.state}: ${sp} contradicts its seat`);
  eq(W.pdxSeatClaim(lp, "statehouse", loc.stateHouseDistrict) === "mismatch", false, `${loc.state}: ${lp} contradicts its seat`);
}
{
  // Speakers already on file, now carrying the district the official source gives.
  for (const [st, d, pid] of [["Tennessee", "25", "cameron_sexton"], ["Indiana", "37", "todd_huston"], ["Missouri", "30", "jon_patterson"]]) {
    const W = boot(at(st, "", "", "1", "1", d));
    eq(levelOf(W, "statehouse").pid, pid, `${st} HD ${d}: the Speaker's existing record is not the one named`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a seat with no shell still says nobody is on file");
// ═════════════════════════════════════════════════════════════════════════════
for (const [st, ch, d, why] of [
  ["Missouri", "statesenate", "10", "vacant on the Missouri Senate's roster"],
  ["Missouri", "statehouse", "29", "vacant in the Missouri House's member file"],
  ["Tennessee", "statehouse", "84", "vacant on the Tennessee House's directory"],
  ["Indiana", "statehouse", "33", "listed by neither Indiana House caucus"],
  ["Indiana", "statehouse", "63", "listed by neither Indiana House caucus"],
  ["Tennessee", "statehouse", "86", "member held only as a candidate row"],
  ["Missouri", "statehouse", "12", "member shares a display name with another record"],
  ["Indiana", "statehouse", "26", "member shares a display name with another record"],
  ["Indiana", "statehouse", "100", "member shares a display name with an Arkansas senator's stance record"],
]) {
  const W = boot(at(st, "", "", "1", ch === "statesenate" ? d : "2", ch === "statehouse" ? d : "3"));
  eq(levelOf(W, ch).pid, null, `${st} ${ch} ${d} (${why}): a member was named`);
  has(band(W), noMember(d), `${st} ${ch} ${d}: the row does not say nobody is on file`);
}
for (const r of REC.nameSharedWithAnotherRecord) ok(!REC.rows.some((x) => x.name === r.name), `record: ${r.name} has a shell and is also listed as a shared name`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every seat in all six chambers names the record's pid or nobody");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = boot(at("Tennessee", "Nashville", "Davidson County", "7", "21", "51"));
  const want = {};
  for (const r of [...REC.rows, ...REC.alreadyHeld, ...REC.districtSet]) want[`${r.state}|${CH[r.chamber]}|${r.district}`] = r.pid;
  const empty = new Set();
  for (const st in REC.vacant) for (const ch in REC.vacant[st]) for (const d of REC.vacant[st][ch]) empty.add(`${st}|${ch}|${d}`);
  for (const d of REC.notAdded.Indiana.statehouse) empty.add(`Indiana|statehouse|${d}`);
  for (const r of REC.onFileAsCandidate) {
    ok(W.CMP_DATA[r.pid] && W.CMP_DATA[r.pid].candidate === true, `record: ${r.pid} is not a candidate row`);
    ok(!want[`${r.state}|${CH[r.chamber]}|${r.district}`], `record: ${r.pid}'s seat was given a shell as well`);
  }
  const SIZE = { Tennessee: [33, 99], Indiana: [50, 100], Missouri: [34, 163] };
  let named = 0, none = 0;
  for (const [st, [nSen, nLow]] of Object.entries(SIZE)) {
    for (const [ch, max] of [["statesenate", nSen], ["statehouse", nLow]]) {
      for (let d = 1; d <= max; d++) {
        const key = `${st}|${ch}|${d}`;
        const got = W._pdxStateLegSeat(st, ch, d) || null;
        eq(got, want[key] || null, `seat: ${key}`);
        if (got) named++; else none++;
        if (empty.has(key)) eq(got, null, `seat: ${key} has no verified member and was filled`);
      }
    }
  }
  eq(named + none, 479, "seat: the six chambers do not add up to 479 seats");
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
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"];
  eq(STATES.length, 48, "fixture: not 47 states and D.C.");
  const now = boot(at("Utah", "Layton", "Davis County", "2", "7", "16"));
  const was = boot(at("Utah", "Layton", "Davis County", "2", "7", "16"), { "cmp-data.js": headData });
  const ctx = (src) => { const w = {}; w.window = w; vm.createContext(w); vm.runInContext(src, w); return w.CMP_DATA; };
  const A = ctx(R("cmp-data.js")), B = ctx(headData);
  const OURS = /^(Tennessee|Indiana|Missouri)\b/;
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
  // The fifteen earlier states' shells: each block itself, and its record, byte for byte.
  for (const [banner, file] of [
    ["// ── Sitting state legislators, California, Texas and Florida — roster shells (Oct 2026)", "db/roster-state-legislators-ca-tx-fl-2026-oct.json"],
    ["// ── Sitting state legislators, New York, Pennsylvania and Illinois — roster shells (Oct 2026)", "db/roster-state-legislators-ny-pa-il-2026-oct.json"],
    ["// ── Sitting state legislators, Ohio, Georgia and North Carolina — roster shells (Oct 2026)", "db/roster-state-legislators-oh-ga-nc-2026-oct.json"],
    ["// ── Sitting state legislators, Michigan, New Jersey and Virginia — roster shells (Oct 2026)", "db/roster-state-legislators-mi-nj-va-2026-oct.json"],
    ["// ── Sitting state legislators, Washington, Arizona and Massachusetts — roster shells (Oct 2026)", "db/roster-state-legislators-wa-az-ma-2026-oct.json"],
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
  ok(!EQUITY.test(R("db/roster-state-legislators-tn-in-mo-2026-oct.json")), "record: carries equity language");
  const v = Number((R("sw.js").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  const v0 = Number(((HEAD("sw.js") || "").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  has(R("sw.js"), "'/cmp-data.js',", "sw: cmp-data.js is no longer precached");
  if (R("cmp-data.js") !== HEAD("cmp-data.js")) ok(v === v0 + 1, `sw: cmp-data.js changed and CACHE_VERSION moved from v${v0} to v${v}`);
}

console.log("");
if (failures.length) {
  failures.slice(0, 60).forEach((f) => console.error(`  ✗ ${f}`));
  console.error(`\n✗ tn/in/mo legislator shells: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ tn/in/mo legislator shells: ${passed} passed — a sitting member only where the official roster seats them, every other state unchanged`);
