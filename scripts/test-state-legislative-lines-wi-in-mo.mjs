#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislative-lines-wi-in-mo.mjs — Wisconsin, Indiana, Missouri
// ─────────────────────────────────────────────────────────────────────────────
// The TIGERweb legislative list now also draws Wisconsin, Indiana and
// Missouri: the same 2024 layers (5 upper, 6 lower), the same one-state-by-
// FIPS query, loaded only after a geocode has named the state. All three
// number their seats plainly (Wisconsin's lower chamber is the Assembly; its
// "ZZZ" water polygons are no district).
//
// What it pins:
//
//   1. THE FINDER OPENS EMPTY in each state, even on a saved record.
//   2. AN ADDRESS IN EACH STATE RESOLVES BOTH CHAMBERS from that state's lines,
//      and every TIGERweb request names that state's FIPS and no other.
//   3. THE CARD NAMES A MEMBER where the roster claims the seat, and reads
//      "District N — no member on file yet" where it does not. Every member the
//      lookup can name, in every seat of all six chambers, is a record that
//      claims that chamber and number — and the set is exactly the district-
//      keyed state legislators on file.
//   4. THE TWENTY STATES ALREADY MAPPED ARE UNCHANGED against HEAD's resolver.
//   5. NO EQUITY LANGUAGE in anything this pass painted or changed.
//
//   node scripts/test-state-legislative-lines-wi-in-mo.mjs

import { R, HEAD, MAP, sq, driveFinder, boot, levelOf, band, tigerUrls, layerOf } from "./state-leg-harness.mjs";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ wi/in/mo legislative lines: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

// The finder's page carries voter-hub-location.js, which owns the seat-label
// tables; the finder harness does not, so it is handed the real ones.
const RES = boot({ state: "Wisconsin" });
must(typeof RES.pdxLegDistrictKey === "function", "the resolver's lettered tables did not load");
const withNames = (F) => {
  for (const k of ["pdxLegDistrictName", "pdxLegDistrictsNamed", "pdxLegChamberNamed", "pdxLegDistrictKey"]) F.win[k] = RES[k];
  return F;
};
const KEY = (st, ch, code) => String(RES.pdxLegDistrictKey(st, ch, code));
// Real points, and what TIGERweb's 2024 layers give for them. `sk`/`hk` are the
// record keys; `sChip`/`hChip` are what the finder's chips must read.
const PLACES = [
  { state: "Wisconsin", fips: "55", city: "Madison", county: "Dane", lat: 43.0747, lng: -89.3841,
    name: "2 E Main St, Madison, WI 53703", sd: "026", hd: "076", cd: "02", sChip: "District 26", hChip: "District 76" },
  { state: "Indiana", fips: "18", city: "Indianapolis", county: "Marion", lat: 39.7684, lng: -86.1581,
    name: "200 W Washington St, Indianapolis, IN 46204", sd: "046", hd: "097", cd: "07", sChip: "District 46", hChip: "District 97" },
  { state: "Missouri", fips: "29", city: "Jefferson City", county: "Cole", lat: 38.5767, lng: -92.1735,
    name: "201 W Capitol Ave, Jefferson City, MO 65101", sd: "006", hd: "060", cd: "03", sChip: "District 6", hChip: "District 60" },
];
for (const p of PLACES) { p.sk = KEY(p.state, "statesenate", p.sd); p.hk = KEY(p.state, "statehouse", p.hd); }
const box = (p, props) => [sq(p.lng - 0.2, p.lat - 0.2, p.lng + 0.2, p.lat + 0.2, props)];
const tigerFor = (p) => ({
  4: { features: box(p, { CD119: p.cd }), point: { CD119: p.cd } },
  5: { features: box(p, { SLDU: p.sd }), point: { SLDU: p.sd } },
  6: { features: box(p, { SLDL: p.hd }), point: { SLDL: p.hd } },
});
const n = (s) => String(parseInt(s, 10));


// ═════════════════════════════════════════════════════════════════════════════
section("1 · the finder opens empty in each state");
// ═════════════════════════════════════════════════════════════════════════════
for (const p of PLACES) {
  const saved = { state: p.state, city: p.city, county: p.county, district: p.cd,
                  stateHouseDistrict: p.hk, stateSenateDistrict: p.sk, mapSelected: true };
  const F = withNames(await driveFinder({ state: p.state, hit: p, tiger: tigerFor(p), saved }));
  F.win.openDistrictMapModal();
  await F.pump();
  eq(F.wire.length, 0, `${p.state}: the finder fetched something on open`);
  eq(F.geojsonLayers.length, 0, `${p.state}: a district layer was built on open`);
  eq(F.chip("house"), p.hChip, `${p.state}: the saved lower-chamber district is not seeded`);
  eq(F.chip("senate"), p.sChip, `${p.state}: the saved State Senate district is not seeded`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · an address in each state resolves State House and State Senate");
// ═════════════════════════════════════════════════════════════════════════════
for (const p of PLACES) {
  const F = withNames(await driveFinder({ state: p.state, hit: { lat: p.lat, lng: p.lng, name: p.name, city: p.city, county: p.county, state: p.state }, tiger: tigerFor(p) }));
  eq(F.wire.length, 0, `${p.state}: something was fetched before the search`);
  await F.search(p.name);
  eq(F.chip("house"), p.hChip, `${p.state}: the lower-chamber district did not resolve`);
  eq(F.chip("senate"), p.sChip, `${p.state}: the State Senate district did not resolve`);
  eq(F.chip("congress"), "District " + n(p.cd), `${p.state}: the U.S. House district stopped resolving`);
  has(F.els["pdx-map-missing"].textContent, "All three districts set", `${p.state}: the bar does not call the answer complete`);
  const loc = F.win._currentVoterLocation;
  eq(loc.state, p.state, `${p.state}: the record is not stamped with the state`);
  eq(loc.stateHouseDistrict, p.hk, `${p.state}: the lower-chamber key did not reach the record`);
  eq(loc.stateSenateDistrict, p.sk, `${p.state}: the State Senate key did not reach the record`);
  if (/[A-Z]$/.test(p.hd)) {
    has(F.els["pdx-map-done"].textContent, "State House · " + p.hChip, `${p.state}: the confirm button does not carry the lettered seat`);
    lacks(F.els["pdx-map-done"].textContent, "State House " + n(p.hd) + " ", `${p.state}: the lettered seat was truncated to its number`);
  }
  const T = tigerUrls(F.wire);
  ok(T.some((u) => layerOf(u) === "5") && T.some((u) => layerOf(u) === "6"), `${p.state}: both legislative layers were not fetched`);
  T.forEach((u) => has(u, `where=STATE%3D%27${p.fips}%27`, `${p.state}: a TIGERweb request is not scoped to ${p.state}`));
  T.forEach((u) => ok(["4", "5", "6"].indexOf(layerOf(u)) >= 0, `${p.state}: an unexpected TIGERweb layer (${layerOf(u)})`));
  const all = F.wire.join("\n");
  lacks(all, "where=1%3D1", `${p.state}: an unscoped (national) query went out`);
  lacks(all, "UtahHouseDistricts", `${p.state}: Utah's State House layer was fetched`);
  lacks(all, "UtahSenateDistricts", `${p.state}: Utah's State Senate layer was fetched`);
}
{
  has(MAP, "var LEG_TIGER_STATES = { 'Texas': 1, 'California': 1, 'Florida': 1, 'New York': 1,\n                             'Illinois': 1, 'Pennsylvania': 1, 'Ohio': 1,\n                             'Georgia': 1, 'Michigan': 1, 'North Carolina': 1,\n                             'Virginia': 1, 'Washington': 1, 'Arizona': 1,\n                             'New Jersey': 1, 'Massachusetts': 1, 'Tennessee': 1,\n                             'Colorado': 1, 'Maryland': 1, 'Minnesota': 1,\n                             'Wisconsin': 1, 'Indiana': 1, 'Missouri': 1,\n                             'Kentucky': 1, 'Alabama': 1, 'South Carolina': 1,\n                             'Iowa': 1, 'Oklahoma': 1, 'Kansas': 1,\n                             'Nevada': 1, 'Nebraska': 1, 'Arkansas': 1,\n                             'Oregon': 1, 'Idaho': 1, 'Montana': 1,\n                             'New Mexico': 1, 'Wyoming': 1 };",
    "source: the finder's TIGERweb legislative list is not exactly these four states");
  has(R("voter-hub-location.js"), "var _PDX_LEG_MAPPED = { texas: 1, california: 1, florida: 1, 'new york': 1,\n                         illinois: 1, pennsylvania: 1, ohio: 1,\n                         georgia: 1, michigan: 1, 'north carolina': 1,\n                         virginia: 1, washington: 1, arizona: 1,\n                         'new jersey': 1, massachusetts: 1, tennessee: 1,\n                         colorado: 1, maryland: 1, minnesota: 1,\n                         wisconsin: 1, indiana: 1, missouri: 1,\n                         kentucky: 1, alabama: 1, 'south carolina': 1,\n                         iowa: 1, oklahoma: 1, kansas: 1,\n                         nevada: 1, nebraska: 1, arkansas: 1,\n                         oregon: 1, idaho: 1, montana: 1,\n                         'new mexico': 1, wyoming: 1 };",
    "source: the resolver's legislative list does not match the finder's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the card names a member only where the roster claims the seat");
// ═════════════════════════════════════════════════════════════════════════════
const at = (p, sd, hd) => ({ state: p.state, city: p.city, county: p.county + " County", district: p.cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const [WI, IN, MO] = PLACES;
const NAMED = [
  // [place, senate key, lower key, expected senate pid, expected name, lower label]
  [WI, "27", "76", "dianne_hesselbein", "Dianne Hesselbein", "District 76"],
  [IN, "40", "97", "shelli_yoder", "Shelli Yoder", "District 97"],
  [MO, "18", "60", "cindy_olaughlin", null, "District 60"],
];
for (const [p, sd, hd, pid, nm, hl] of NAMED) {
  const W = boot(at(p, sd, hd));
  must(typeof W._pdxStateLegSeat === "function", "the resolver did not load");
  const reps = W.pdxRepsForMe();
  eq(reps.legislativeMapped, true, `${p.state}: not legislatively mapped`);
  eq(reps.districtsResolvable, false, `${p.state}: districtsResolvable went true — it still gates Utah's curated local offices`);
  const ss = levelOf(W, "statesenate"), sh = levelOf(W, "statehouse");
  eq(ss.district, sd, `${p.state}: the State Senate district did not reach the level`);
  eq(ss.pid, pid, `${p.state}: SD ${sd}'s member on file was not named`);
  eq(sh.district, hd, `${p.state}: the lower-chamber district did not reach the level`);
  eq(sh.pid, null, `${p.state}: a lower-chamber member was named for a seat no record claims`);
  ok(ss.mapped && sh.mapped, `${p.state}: a legislative level is not marked mapped`);
  const out = band(W);
  has(out, W.CMP_DATA[pid].name.replace(/'/g, "&#39;"), `${p.state}: the State Senate member is not on the card`);
  if (nm) eq(W.CMP_DATA[pid].name, nm, `${p.state}: fixture name drifted`);
  has(out, `${hl} — no member on file yet`, `${p.state}: the unclaimed lower-chamber seat does not say nobody is on file`);
  eq(sh.distLabel, "State House · " + hl, `${p.state}: the lower-chamber heading is not the seat's label`);
  lacks(out, "only maps state legislative districts in", `${p.state}: the reader is told their lines are not drawn`);
  ok(!EQUITY.test(out.replace(/<[^>]+>/g, " ")), `${p.state}: the card carries equity language`);
}
{
  // A seat nobody claims: the Madison address's own SD 26.
  const W = boot(at(WI, "26", "76"));
  eq(levelOf(W, "statesenate").pid, null, "Wisconsin SD 26: a member was invented");
  has(band(W), "District 26 — no member on file yet", "Wisconsin SD 26: the row does not say nobody is on file");
}
{
  // Every seat in all six chambers.
  const W = boot(at(WI, "1", "1"));
  const CHAMBERS = [["Wisconsin", 33, 99], ["Indiana", 50, 100], ["Missouri", 34, 163]];
  const named = new Set();
  for (const [st, nSen, nLow] of CHAMBERS) {
    for (const [ch, max] of [["statesenate", nSen], ["statehouse", nLow]]) {
      for (let d = 1; d <= max; d++) {
        const pid = W._pdxStateLegSeat(st, ch, d);
        if (!pid) continue;
        named.add(pid);
        const rec = W.CMP_DATA[pid];
        ok(rec && String(rec.state).indexOf(st) === 0, `roster: ${pid} is not a ${st} record`);
        ok(rec && /\bstate\b|\bassembly/i.test(rec.office), `roster: ${pid}'s office (${rec && rec.office}) does not name a state chamber`);
        ok(rec && new RegExp("^(SD|HD|LD)?\\s*" + d + "$").test(String(rec.district || "").trim()), `roster: ${pid}'s record does not name ${ch} ${d}`);
        eq(W.pdxSeatClaim(pid, ch, d) === "mismatch", false, `roster: ${pid} seated in ${st} ${ch} ${d}, which its record contradicts`);
      }
    }
  }
  eq(JSON.stringify([...named].sort()),
    JSON.stringify(["chris_garten", "cindy_olaughlin", "devin_lemahieu", "dianne_hesselbein", "doug_beck", "mary_felzkowski",
      "rodric_bray", "shelli_yoder", "tony_luetkemeyer"]),
    "roster: the members the lookup can name are not exactly the district-keyed state legislators on file");
  // Leaders whose records name no district, and U.S. House members whose titles
  // say "House", are never placed in a legislative seat.
  for (const p of ["jon_patterson", "todd_huston", "greta_neubauer", "robin_vos", "jason_smith", "bryan_steil", "sam_graves"]) {
    ok(!named.has(p), `roster: ${p} was placed in a legislative seat`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the twenty states already mapped are identical to HEAD's");
// ═════════════════════════════════════════════════════════════════════════════
{
  const headVhl = HEAD("voter-hub-location.js");
  const LOCS = [
    { state: "Utah", city: "Layton", county: "Davis County", district: "2", stateHouseDistrict: "16", stateSenateDistrict: "7", mapSelected: true },
    { state: "Utah", city: "Vernal", county: "Uintah County", district: "3", stateHouseDistrict: "68", stateSenateDistrict: "26", mapSelected: true },
    { state: "Utah", city: "Provo", county: "Utah County", district: "3" },
    { state: "Texas", city: "Houston", county: "Harris County", district: "7", stateSenateDistrict: "7", stateHouseDistrict: "95", mapSelected: true },
    { state: "Texas", city: "Plano", county: "Collin County", district: "3", stateSenateDistrict: "8", stateHouseDistrict: "66", mapSelected: true },
    { state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12", stateSenateDistrict: "10", stateHouseDistrict: "95", mapSelected: true },
    { state: "Texas", city: "Houston", county: "Harris County", district: "7" },
    { state: "California", city: "San Francisco", county: "San Francisco County", district: "11", stateSenateDistrict: "11", stateHouseDistrict: "17", mapSelected: true },
    { state: "California", city: "San Diego", county: "San Diego County", district: "50", stateSenateDistrict: "40", stateHouseDistrict: "76", mapSelected: true },
    { state: "Florida", city: "Aventura", county: "Miami-Dade County", district: "24", stateSenateDistrict: "37", stateHouseDistrict: "106", mapSelected: true },
    { state: "Florida", city: "Naples", county: "Collier County", district: "19", stateSenateDistrict: "28", stateHouseDistrict: "81", mapSelected: true },
    { state: "New York", city: "Astoria", county: "Queens County", district: "14", stateSenateDistrict: "12", stateHouseDistrict: "36", mapSelected: true },
    { state: "New York", city: "Lockport", county: "Niagara County", district: "24", stateSenateDistrict: "62", stateHouseDistrict: "144", mapSelected: true },
    { state: "Illinois", city: "Chicago", county: "Cook County", district: "7", stateSenateDistrict: "4", stateHouseDistrict: "6", mapSelected: true },
    { state: "Illinois", city: "Chicago", county: "Cook County", district: "7", stateSenateDistrict: "3", stateHouseDistrict: "6", mapSelected: true },
    { state: "Pennsylvania", city: "Philadelphia", county: "Philadelphia County", district: "3", stateSenateDistrict: "3", stateHouseDistrict: "182", mapSelected: true },
    { state: "Pennsylvania", city: "Gettysburg", county: "Adams County", district: "13", stateSenateDistrict: "33", stateHouseDistrict: "91", mapSelected: true },
    { state: "Ohio", city: "Columbus", county: "Franklin County", district: "15", stateSenateDistrict: "15", stateHouseDistrict: "1", mapSelected: true },
    { state: "Ohio", city: "Toledo", county: "Lucas County", district: "9", stateSenateDistrict: "2", stateHouseDistrict: "44", mapSelected: true },
    { state: "Georgia", city: "Atlanta", county: "Fulton County", district: "5", stateSenateDistrict: "36", stateHouseDistrict: "58", mapSelected: true },
    { state: "Georgia", city: "Augusta", county: "Richmond County", district: "12", stateSenateDistrict: "22", stateHouseDistrict: "126", mapSelected: true },
    { state: "Michigan", city: "Royal Oak", county: "Oakland County", district: "11", stateSenateDistrict: "8", stateHouseDistrict: "6", mapSelected: true },
    { state: "Michigan", city: "Detroit", county: "Wayne County", district: "13", stateSenateDistrict: "1", stateHouseDistrict: "9", mapSelected: true },
    { state: "North Carolina", city: "Raleigh", county: "Wake County", district: "2", stateSenateDistrict: "17", stateHouseDistrict: "38", mapSelected: true },
    { state: "North Carolina", city: "Raleigh", county: "Wake County", district: "2", stateSenateDistrict: "14", stateHouseDistrict: "38", mapSelected: true },
    { state: "Virginia", city: "Richmond", county: "Richmond city", district: "4", stateSenateDistrict: "14", stateHouseDistrict: "78", mapSelected: true },
    { state: "Virginia", city: "Woodbridge", county: "Prince William County", district: "7", stateSenateDistrict: "34", stateHouseDistrict: "23", mapSelected: true },
    { state: "Washington", city: "Seattle", county: "King County", district: "7", stateSenateDistrict: "43", stateHouseDistrict: "43", mapSelected: true },
    { state: "Arizona", city: "Phoenix", county: "Maricopa County", district: "3", stateSenateDistrict: "11", stateHouseDistrict: "11", mapSelected: true },
    { state: "Arizona", city: "Tucson", county: "Pima County", district: "7", stateSenateDistrict: "18", stateHouseDistrict: "18", mapSelected: true },
    { state: "New Jersey", city: "Newark", county: "Essex County", district: "10", stateSenateDistrict: "29", stateHouseDistrict: "29", mapSelected: true },
    { state: "Massachusetts", city: "Gloucester", county: "Essex County", district: "6", stateSenateDistrict: "21", stateHouseDistrict: "28", mapSelected: true },
    { state: "Massachusetts", city: "Newton", county: "Middlesex County", district: "4", stateSenateDistrict: "17", stateHouseDistrict: "69", mapSelected: true },
    { state: "Tennessee", city: "Nashville", county: "Davidson County", district: "7", stateSenateDistrict: "21", stateHouseDistrict: "51", mapSelected: true },
    { state: "Tennessee", city: "Memphis", county: "Shelby County", district: "9", stateSenateDistrict: "29", stateHouseDistrict: "90", mapSelected: true },
    { state: "Colorado", city: "Denver", county: "Denver County", district: "1", stateSenateDistrict: "31", stateHouseDistrict: "5", mapSelected: true },
    { state: "Colorado", city: "Alamosa", county: "Alamosa County", district: "3", stateSenateDistrict: "6", stateHouseDistrict: "62", mapSelected: true },
    { state: "Maryland", city: "Annapolis", county: "Anne Arundel County", district: "3", stateSenateDistrict: "30",
      stateHouseDistrict: String(RES.pdxLegDistrictKey("Maryland", "statehouse", "30A")), mapSelected: true },
    { state: "Maryland", city: "Hagerstown", county: "Washington County", district: "6", stateSenateDistrict: "39",
      stateHouseDistrict: String(RES.pdxLegDistrictKey("Maryland", "statehouse", "003")), mapSelected: true },
    { state: "Minnesota", city: "Minneapolis", county: "Hennepin County", district: "5", stateSenateDistrict: "59",
      stateHouseDistrict: String(RES.pdxLegDistrictKey("Minnesota", "statehouse", "59B")), mapSelected: true },
    { state: "Mississippi", city: "Jackson", county: "Hinds County", district: "2", stateSenateDistrict: "17", stateHouseDistrict: "33" },
  ];
  must(headVhl, "no git baseline for voter-hub-location.js");
  const pick = (r) => JSON.stringify([r.legislativeMapped, r.districtsResolvable, r.levels.map((l) => [l.key, l.district, l.pid, l.mapped, l.distLabel, l.districtName || null])]);
  for (const loc of LOCS) {
    const now = boot(Object.assign({}, loc)).pdxRepsForMe();
    const was = boot(Object.assign({}, loc), { "voter-hub-location.js": headVhl }).pdxRepsForMe();
    eq(pick(now), pick(was), `${loc.state} ${loc.city}: the resolver's answer changed`);
  }
  const LOC = (st, sd) => LOCS.find((l) => l.state === st && l.stateSenateDistrict === sd);
  for (const [st, sd, pid] of [["Texas", "7", "bettencourt_tx"], ["California", "11", "wiener_ca"], ["Florida", "37", "pizzo_fl"],
                               ["New York", "12", "gianaris_ny"], ["Illinois", "4", "kimberly_lightford"],
                               ["Pennsylvania", "33", "doug_mastriano"], ["Ohio", "2", "theresa_gavarone"],
                               ["Georgia", "22", "harold_jones_ga"], ["Michigan", "8", "mallory_mcmorrow"], ["North Carolina", "17", "sydney_batch"],
                               ["Virginia", "34", "scott_surovell"], ["Washington", "43", "jamie_pedersen"], ["Arizona", "18", "priya_sundareshan"],
                               ["New Jersey", "29", "teresa_ruiz"], ["Massachusetts", "21", "bruce_tarr"], ["Tennessee", "29", "raumesh_akbari"],
                               ["Colorado", "6", "cleave_simpson"], ["Maryland", "39", "nancy_king"], ["Minnesota", "59", "bobby_joe_champion"]]) {
    eq(levelOf(boot(LOC(st, sd)), "statesenate").pid, pid, `${st} SD ${sd} stopped naming its member`);
  }
  const O = boot(LOC("Mississippi", "17"));
  eq(levelOf(O, "statehouse").mapped, false, "Mississippi's legislative seats claim to be mapped");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no equity language, and the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const head = HEAD("find.html") || "";
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["find.html", "voter-hub-location.js", "who-represents-me.js"]) {
    const was = HEAD(f) || "";
    ok(!EQUITY.test(strip(added(R(f), was))), `${f}: this pass added equity language`);
  }
  ok(head.length > 0, "no git baseline for find.html");
  const SW = R("sw.js");
  const v = Number((SW.match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  const v0 = Number(((HEAD("sw.js") || "").match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  if (head !== R("find.html")) ok(v === v0 + 1, `sw: find.html changed and CACHE_VERSION moved from v${v0} to v${v}`);
  has(SW, "'/find.html',", "sw: find.html is no longer precached");
}

console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  console.error(`\n✗ wi/in/mo legislative lines: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ wi/in/mo legislative lines: ${passed} passed — three more states' lines, one state at a time, a member only where the roster claims the seat`);
