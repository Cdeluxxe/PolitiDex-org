#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislative-lines-ca-fl-ny.mjs — California, Florida and New York
// ─────────────────────────────────────────────────────────────────────────────
// The TIGERweb legislative list that drew Texas now also draws California,
// Florida and New York: the same 2024 layers (5 upper, 6 lower — the Assembly
// in California and New York), the same one-state-by-FIPS query, loaded only
// after a geocode has named the state. The resolver names a sitting member
// only from an in-office roster record whose office names a STATE chamber and
// whose own district field names that exact number.
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
//   4. UTAH AND TEXAS ARE UNCHANGED against HEAD's resolver.
//   5. NO EQUITY LANGUAGE in anything this pass painted or changed.
//
//   node scripts/test-state-legislative-lines-ca-fl-ny.mjs

import { R, HEAD, MAP, sq, driveFinder, boot, levelOf, band, tigerUrls, layerOf } from "./state-leg-harness.mjs";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ ca/fl/ny legislative lines: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

// Real points, and the districts TIGERweb's 2024 layers give for them.
const PLACES = [
  { state: "California", fips: "06", city: "San Francisco", county: "San Francisco", lat: 37.7793, lng: -122.4193,
    name: "1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102", sd: "011", hd: "017", cd: "11" },
  { state: "Florida", fips: "12", city: "Aventura", county: "Miami-Dade", lat: 25.9565, lng: -80.1392,
    name: "19200 W Country Club Dr, Aventura, FL 33180", sd: "037", hd: "106", cd: "24" },
  { state: "New York", fips: "36", city: "Astoria", county: "Queens", lat: 40.7644, lng: -73.9235,
    name: "31-00 Broadway, Astoria, NY 11106", sd: "059", hd: "036", cd: "14" },
];
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
                  stateHouseDistrict: n(p.hd), stateSenateDistrict: n(p.sd), mapSelected: true };
  const F = await driveFinder({ state: p.state, hit: p, tiger: tigerFor(p), saved });
  F.win.openDistrictMapModal();
  await F.pump();
  eq(F.wire.length, 0, `${p.state}: the finder fetched something on open`);
  eq(F.geojsonLayers.length, 0, `${p.state}: a district layer was built on open`);
  eq(F.chip("house"), "District " + n(p.hd), `${p.state}: the saved lower-chamber district is not seeded`);
  eq(F.chip("senate"), "District " + n(p.sd), `${p.state}: the saved State Senate district is not seeded`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · an address in each state resolves State House and State Senate");
// ═════════════════════════════════════════════════════════════════════════════
for (const p of PLACES) {
  const F = await driveFinder({ state: p.state, hit: { lat: p.lat, lng: p.lng, name: p.name, city: p.city, county: p.county, state: p.state }, tiger: tigerFor(p) });
  eq(F.wire.length, 0, `${p.state}: something was fetched before the search`);
  await F.search(p.name);
  eq(F.chip("house"), "District " + n(p.hd), `${p.state}: the lower-chamber district did not resolve`);
  eq(F.chip("senate"), "District " + n(p.sd), `${p.state}: the State Senate district did not resolve`);
  eq(F.chip("congress"), "District " + n(p.cd), `${p.state}: the U.S. House district stopped resolving`);
  has(F.els["pdx-map-missing"].textContent, "All three districts set", `${p.state}: the bar does not call the answer complete`);
  const loc = F.win._currentVoterLocation;
  eq(loc.state, p.state, `${p.state}: the record is not stamped with the state`);
  eq(loc.stateHouseDistrict, n(p.hd), `${p.state}: the lower-chamber number did not reach the record`);
  eq(loc.stateSenateDistrict, n(p.sd), `${p.state}: the State Senate number did not reach the record`);
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
  has(MAP, "var LEG_TIGER_STATES = { 'Texas': 1, 'California': 1, 'Florida': 1, 'New York': 1,\n                             'Illinois': 1, 'Pennsylvania': 1, 'Ohio': 1,\n                             'Georgia': 1, 'Michigan': 1, 'North Carolina': 1,\n                             'Virginia': 1, 'Washington': 1, 'Arizona': 1,\n                             'New Jersey': 1, 'Massachusetts': 1, 'Tennessee': 1,\n                             'Colorado': 1, 'Maryland': 1, 'Minnesota': 1,\n                             'Wisconsin': 1, 'Indiana': 1, 'Missouri': 1,\n                             'Kentucky': 1, 'Alabama': 1, 'South Carolina': 1,\n                             'Iowa': 1, 'Oklahoma': 1, 'Kansas': 1,\n                             'Nevada': 1, 'Nebraska': 1, 'Arkansas': 1,\n                             'Oregon': 1, 'Idaho': 1, 'Montana': 1,\n                             'New Mexico': 1, 'Wyoming': 1,\n                             'Mississippi': 1, 'West Virginia': 1, 'Hawaii': 1,\n                             'Louisiana': 1, 'Maine': 1, 'New Hampshire': 1 };",
    "source: the finder's TIGERweb legislative list is not exactly these four states");
  has(R("voter-hub-location.js"), "var _PDX_LEG_MAPPED = { texas: 1, california: 1, florida: 1, 'new york': 1,\n                         illinois: 1, pennsylvania: 1, ohio: 1,\n                         georgia: 1, michigan: 1, 'north carolina': 1,\n                         virginia: 1, washington: 1, arizona: 1,\n                         'new jersey': 1, massachusetts: 1, tennessee: 1,\n                         colorado: 1, maryland: 1, minnesota: 1,\n                         wisconsin: 1, indiana: 1, missouri: 1,\n                         kentucky: 1, alabama: 1, 'south carolina': 1,\n                         iowa: 1, oklahoma: 1, kansas: 1,\n                         nevada: 1, nebraska: 1, arkansas: 1,\n                         oregon: 1, idaho: 1, montana: 1,\n                         'new mexico': 1, wyoming: 1,\n                         mississippi: 1, 'west virginia': 1, hawaii: 1,\n                         louisiana: 1, maine: 1, 'new hampshire': 1 };",
    "source: the resolver's legislative list does not match the finder's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the card names a member only where the roster claims the seat");
// ═════════════════════════════════════════════════════════════════════════════
const at = (p, sd, hd) => ({ state: p.state, city: p.city, county: p.county + " County", district: p.cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const [CA, FL, NY] = PLACES;
const NAMED = [
  // [place, senate district, lower district, expected senate pid, expected name]
  [CA, "11", "17", "wiener_ca", "Scott Wiener"],
  [FL, "37", "106", "pizzo_fl", null],
  [NY, "12", "36", "gianaris_ny", "Michael Gianaris"],
];
for (const [p, sd, hd, pid, nm] of NAMED) {
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
  has(out, W.CMP_DATA[pid].name, `${p.state}: the State Senate member is not on the card`);
  if (nm) eq(W.CMP_DATA[pid].name, nm, `${p.state}: fixture name drifted`);
  has(out, `District ${hd} — no member on file yet`, `${p.state}: the unclaimed lower-chamber seat does not say nobody is on file`);
  lacks(out, "only maps state legislative districts in", `${p.state}: the reader is told their lines are not drawn`);
  ok(!EQUITY.test(out.replace(/<[^>]+>/g, " ")), `${p.state}: the card carries equity language`);
}
{
  // A seat nobody claims: the address's own SD in New York (59) and Florida HD 106.
  const W = boot(at(NY, "59", "36"));
  eq(levelOf(W, "statesenate").pid, null, "New York SD 59: a member was invented");
  has(band(W), "District 59 — no member on file yet", "New York SD 59: the row does not say nobody is on file");
}
{
  // Every seat in all six chambers.
  const W = boot(at(CA, "1", "1"));
  const CHAMBERS = [["California", 40, 80], ["Florida", 40, 120], ["New York", 63, 150]];
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
        ok(rec && new RegExp("^(SD|HD)?\\s*" + d + "$").test(String(rec.district || "").trim()), `roster: ${pid}'s record does not name ${ch} ${d}`);
        eq(W.pdxSeatClaim(pid, ch, d) === "mismatch", false, `roster: ${pid} seated in ${st} ${ch} ${d}, which its record contradicts`);
      }
    }
  }
  eq(JSON.stringify([...named].sort()),
    JSON.stringify(["bjones_ca", "gianaris_ny", "limon_ca", "ortt_ny", "passidomo_fl", "pizzo_fl", "wiener_ca"]),
    "roster: the members the lookup can name are not exactly the district-keyed state legislators on file");
  // Leaders whose records name no district, and U.S. House members whose titles
  // say "House", are never placed in a legislative seat.
  for (const p of ["mike_mcguire", "robert_rivas", "heath_flora", "ben_albritton", "daniel_perez_fl", "stewart_cousins", "carl_heastie", "brian_mast", "meeks"]) {
    ok(!named.has(p), `roster: ${p} was placed in a legislative seat`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Utah and Texas are identical to HEAD's");
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
    { state: "Connecticut", city: "Hartford", county: "Hartford County", district: "2", stateSenateDistrict: "17", stateHouseDistrict: "33" },
  ];
  must(headVhl, "no git baseline for voter-hub-location.js");
  const pick = (r) => JSON.stringify([r.legislativeMapped, r.districtsResolvable, r.levels.map((l) => [l.key, l.district, l.pid, l.mapped])]);
  for (const loc of LOCS) {
    const now = boot(Object.assign({}, loc)).pdxRepsForMe();
    const was = boot(Object.assign({}, loc), { "voter-hub-location.js": headVhl }).pdxRepsForMe();
    eq(pick(now), pick(was), `${loc.state} ${loc.city}: the resolver's answer changed`);
  }
  const W = boot(LOCS[3]);
  eq(levelOf(W, "statesenate").pid, "bettencourt_tx", "Texas SD 7 stopped naming its member");
  const O = boot(LOCS[7]);
  eq(levelOf(O, "statehouse").mapped, false, "Connecticut's legislative seats claim to be mapped");
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
  console.error(`\n✗ ca/fl/ny legislative lines: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ ca/fl/ny legislative lines: ${passed} passed — three more states' lines, one state at a time, a member only where the roster claims the seat`);
