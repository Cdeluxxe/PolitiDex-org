#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-texas-legislative-lines.mjs — State House and State Senate lines for Texas
// ─────────────────────────────────────────────────────────────────────────────
// Texas is the second state whose two legislative chambers /find draws. The
// lines come from TIGERweb's 2024 State Legislative Districts layers (5 upper,
// 6 lower), queried one state at a time by FIPS — the same pattern as the
// congressional layer — and only after a geocode has said Texas. The resolver
// then names the sitting member for those seats only from a roster record that
// claims that chamber and that number.
//
// What it pins:
//
//   1. THE FINDER OPENS EMPTY. Opening it with a saved Texas record fetches no
//      boundary and draws no polygon.
//   2. A TEXAS ADDRESS RESOLVES BOTH CHAMBERS from the TIGERweb lines, and the
//      saved record carries both numbers.
//   3. A SEAM MISS IS ASKED, NOT GUESSED: a point the simplified lines do not
//      contain is put to the unsimplified layer, still scoped to Texas.
//   4. NO NATIONAL LAYER, EVER. Every TIGERweb request names one state's FIPS;
//      no legislative layer is asked for outside Texas and Utah, and Utah's
//      UGRC layers are never asked for a Texas pin.
//   5. THE CARD NAMES A MEMBER WHEN THE ROSTER HAS ONE, and says "no member on
//      file yet" when it does not. Every member it names is a record that
//      claims that exact chamber and number.
//   6. UTAH IS UNCHANGED: the resolver's legislative levels for Utah readers are
//      identical to HEAD's.
//
//   node scripts/test-texas-legislative-lines.mjs

import { R, HEAD, MAP, sq, driveFinder, boot, levelOf, band, tigerUrls, layerOf } from "./state-leg-harness.mjs";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ texas legislative lines: STALE HARNESS — ${m}`); process.exit(2); } };


// ═════════════════════════════════════════════════════════════════════════════
// A driven finder: the real controller, a Leaflet stub that runs the real
// onEachFeature binding, and a network that answers TIGERweb and UGRC by URL.
// ═════════════════════════════════════════════════════════════════════════════
// Fort Worth. Every square below holds the point; the seam scenario moves the
// legislative squares off it.
const FTW = { lat: 32.7555, lng: -97.3308 };
const around = (props, off = 0) => [sq(FTW.lng - 0.2 + off, FTW.lat - 0.2, FTW.lng + 0.2 + off, FTW.lat + 0.2, props)];
const TX_TIGER = {
  4: { features: around({ CD119: "12" }), point: { CD119: "12" } },
  5: { features: around({ SLDU: "010" }), point: { SLDU: "010" } },
  6: { features: around({ SLDL: "095" }), point: { SLDL: "095" } },
};
const TX_HIT = { lat: FTW.lat, lng: FTW.lng, name: "200 Texas St, Fort Worth, TX 76102", city: "Fort Worth", county: "Tarrant", state: "Texas" };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the finder opens empty, even on a saved Texas record");
// ═════════════════════════════════════════════════════════════════════════════
{
  const saved = { state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12",
                  stateHouseDistrict: "95", stateSenateDistrict: "10", mapSelected: true };
  const F = await driveFinder({ state: "Texas", hit: TX_HIT, tiger: TX_TIGER, saved });
  F.win.openDistrictMapModal();
  await F.pump();
  eq(F.wire.filter((u) => !/^bare:/.test(u)).length, 0, "open: the finder fetched something on open");
  eq(F.wire.length, 0, "open: a bare fetch went out on open");
  eq(F.geojsonLayers.length, 0, "open: a district layer was built on open");
  eq(F.chip("house"), "District 95", "open: the saved Texas State House district is not seeded into its chip");
  eq(F.chip("senate"), "District 10", "open: the saved Texas State Senate district is not seeded into its chip");
  ok(F.els["pdx-layer-house"].style.display !== "none", "open: the State House toggle is hidden for a Texas reader");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a Texas address resolves State House and State Senate");
// ═════════════════════════════════════════════════════════════════════════════
{
  const F = await driveFinder({ state: "Texas", hit: TX_HIT, tiger: TX_TIGER });
  eq(F.wire.length, 0, "search: something was fetched before the search");
  await F.search("200 Texas St, Fort Worth");
  eq(F.chip("house"), "District 95", "search: the Texas State House district did not resolve");
  eq(F.chip("senate"), "District 10", "search: the Texas State Senate district did not resolve");
  eq(F.chip("congress"), "District 12", "search: the U.S. House district stopped resolving in Texas");
  has(F.els["pdx-map-missing"].textContent, "All three districts set", "search: the bar does not call the Texas answer complete");
  const loc = F.win._currentVoterLocation;
  eq(loc.state, "Texas", "search: the record is not stamped Texas");
  eq(loc.stateHouseDistrict, "95", "search: the State House number did not reach the record");
  eq(loc.stateSenateDistrict, "10", "search: the State Senate number did not reach the record");
  eq(loc.district, "12", "search: the U.S. House number did not reach the record");

  const T = tigerUrls(F.wire);
  ok(T.some((u) => layerOf(u) === "5"), "search: the State Senate layer (5) was not fetched");
  ok(T.some((u) => layerOf(u) === "6"), "search: the State House layer (6) was not fetched");
  T.forEach((u) => has(u, "where=STATE%3D%2748%27", `search: a TIGERweb request is not scoped to Texas (${u.slice(0, 120)})`));
  T.forEach((u) => ok(["4", "5", "6"].indexOf(layerOf(u)) >= 0, `search: an unexpected TIGERweb layer was asked for (${layerOf(u)})`));
  lacks(F.wire.join("\n"), "UtahHouseDistricts", "search: Utah's State House layer was fetched for a Texas pin");
  lacks(F.wire.join("\n"), "UtahSenateDistricts", "search: Utah's State Senate layer was fetched for a Texas pin");
  lacks(F.wire.join("\n"), "where=1%3D1", "search: an unscoped (national) query went out");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a seam miss is asked of the unsimplified lines, not guessed");
// ═════════════════════════════════════════════════════════════════════════════
{
  const seam = {
    4: TX_TIGER[4],
    5: { features: around({ SLDU: "009" }, 1), point: { SLDU: "010" } },
    6: { features: around({ SLDL: "094" }, 1), point: { SLDL: "095" } },
  };
  const F = await driveFinder({ state: "Texas", hit: TX_HIT, tiger: seam });
  await F.search("200 Texas St, Fort Worth");
  eq(F.chip("house"), "District 95", "seam: the State House seam miss was not resolved by the point query");
  eq(F.chip("senate"), "District 10", "seam: the State Senate seam miss was not resolved by the point query");
  const pts = tigerUrls(F.wire).filter((u) => u.indexOf("returnGeometry=false") > 0 && ["5", "6"].indexOf(layerOf(u)) >= 0);
  eq(pts.length, 2, "seam: expected one point query per missed chamber");
  pts.forEach((u) => has(u, "where=STATE%3D%2748%27", "seam: the point query is not scoped to Texas"));

  // And when the authority has nothing either, the seat stays empty.
  const none = { 4: TX_TIGER[4], 5: { features: around({ SLDU: "009" }, 1) }, 6: { features: around({ SLDL: "094" }, 1) } };
  const G = await driveFinder({ state: "Texas", hit: TX_HIT, tiger: none });
  await G.search("200 Texas St, Fort Worth");
  eq(G.chip("house"), "Not set", "seam: a State House seat nobody could place was filled anyway (a nearest-centroid guess)");
  eq(G.chip("senate"), "Not set", "seam: a State Senate seat nobody could place was filled anyway");
  has(G.els["pdx-map-missing"].textContent, "Still missing", "seam: the bar does not say the legislative seats are missing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no legislative layer outside the mapped states; Utah keeps UGRC");
// ═════════════════════════════════════════════════════════════════════════════
{
  const LOU = { lat: 30.4571, lng: -91.1874 };
  const F = await driveFinder({
    state: "Louisiana",
    hit: { lat: LOU.lat, lng: LOU.lng, name: "900 N 3rd St, Baton Rouge, LA", city: "Baton Rouge", county: "East Baton Rouge", state: "Louisiana" },
    tiger: { 4: { features: [sq(LOU.lng - 0.2, LOU.lat - 0.2, LOU.lng + 0.2, LOU.lat + 0.2, { CD119: "02" })] } },
  });
  await F.search("900 N 3rd St, Baton Rouge");
  eq(F.chip("congress"), "District 2", "louisiana: the U.S. House stopped resolving in Louisiana");
  const T = tigerUrls(F.wire);
  ok(T.length > 0 && T.every((u) => layerOf(u) === "4"), `louisiana: a legislative layer was fetched for a Louisiana pin (${T.map(layerOf).join(",")})`);
  T.forEach((u) => has(u, "where=STATE%3D%2722%27", "louisiana: a TIGERweb request is not scoped to Louisiana"));
  eq(F.els["pdx-layer-house"].style.display, "none", "louisiana: the State House toggle is offered in Louisiana");
  eq(F.win._currentVoterLocation.stateHouseDistrict, "", "louisiana: a State House number was written for a Louisiana save");

  const UT = { lat: 40.7, lng: -111.9 };
  const U = await driveFinder({
    state: "Utah",
    hit: { lat: UT.lat, lng: UT.lng, name: "123 Main St, Layton, UT", city: "Layton", county: "Davis", state: "Utah" },
    ugrc: {
      house: [sq(-112.0, 40.6, -111.8, 40.8, { DIST: 15 })],
      senate: [sq(-112.0, 40.6, -111.6, 40.8, { DIST: 7 })],
      congress: [sq(-112.0, 40.6, -111.6, 40.8, { DISTRICT: 2 })],
    },
  });
  await U.search("123 Main St, Layton");
  eq(U.chip("house"), "District 15", "utah: the Utah State House chip changed");
  eq(U.chip("senate"), "District 7", "utah: the Utah State Senate chip changed");
  eq(U.chip("congress"), "District 2", "utah: the Utah U.S. House chip changed");
  eq(tigerUrls(U.wire).length, 0, "utah: a TIGERweb layer was fetched for a Utah pin");
  has(U.wire.join("\n"), "UtahHouseDistricts", "utah: Utah no longer reads its own UGRC State House layer");
}

// Source guards on the shape: one state per query, pinned vintage.
{
  has(MAP, "TIGERweb/Legislative/MapServer/5/query", "source: the State Senate layer is not TIGERweb's 2024 upper layer");
  has(MAP, "TIGERweb/Legislative/MapServer/6/query", "source: the State House layer is not TIGERweb's 2024 lower layer");
  lacks(MAP, "MapServer/1/query", "source: the 2026 upper layer is being queried");
  lacks(MAP, "MapServer/2/query", "source: the 2026 lower layer is being queried");
  has(MAP, "var LEG_TIGER_STATES = { 'Texas': 1, 'California': 1, 'Florida': 1, 'New York': 1,\n                             'Illinois': 1, 'Pennsylvania': 1, 'Ohio': 1,\n                             'Georgia': 1, 'Michigan': 1, 'North Carolina': 1,\n                             'Virginia': 1, 'Washington': 1, 'Arizona': 1,\n                             'New Jersey': 1, 'Massachusetts': 1, 'Tennessee': 1,\n                             'Colorado': 1, 'Maryland': 1, 'Minnesota': 1,\n                             'Wisconsin': 1, 'Indiana': 1, 'Missouri': 1,\n                             'Kentucky': 1, 'Alabama': 1, 'South Carolina': 1,\n                             'Iowa': 1, 'Oklahoma': 1, 'Kansas': 1,\n                             'Nevada': 1, 'Nebraska': 1, 'Arkansas': 1,\n                             'Oregon': 1, 'Idaho': 1, 'Montana': 1,\n                             'New Mexico': 1, 'Wyoming': 1,\n                             'Mississippi': 1, 'West Virginia': 1, 'Hawaii': 1 };", "source: the TIGERweb legislative state list changed");
}

// ═════════════════════════════════════════════════════════════════════════════
// The resolver and the card, on the real roster.
// ═════════════════════════════════════════════════════════════════════════════
const TX = (sd, hd) => ({ state: "Texas", city: "Houston", county: "Harris County", district: "7",
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the card names a member when the roster has one, and nobody otherwise");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = boot(TX("7", "95"));
  must(typeof W.pdxRepsForMe === "function" && typeof W._pdxStateLegSeat === "function", "the resolver did not load");
  const reps = W.pdxRepsForMe();
  eq(reps.legislativeMapped, true, "resolver: Texas is not legislatively mapped");
  eq(reps.districtsResolvable, false, "resolver: districtsResolvable went true in Texas — it still gates Utah's curated local offices");
  const ss = levelOf(W, "statesenate"), sh = levelOf(W, "statehouse");
  eq(ss.district, "7", "resolver: the Texas State Senate district did not reach the level");
  eq(ss.pid, "bettencourt_tx", "resolver: the sitting SD 7 member on file was not named");
  eq(ss.mapped, true, "resolver: the Texas State Senate level is not marked mapped");
  eq(sh.district, "95", "resolver: the Texas State House district did not reach the level");
  eq(sh.pid, null, "resolver: a State House member was named for a seat no roster record claims");
  eq(sh.mapped, true, "resolver: the Texas State House level is not marked mapped");

  const out = band(W);
  has(out, "Paul Bettencourt", "card: the sitting Texas State Senator on file is not on the card");
  has(out, "District 95 — no member on file yet", "card: the Texas State House row does not say nobody is on file");
  lacks(out, "only maps state legislative districts in", "card: a Texas reader is told their legislative lines are not drawn");

  // Every seat in both chambers: whoever is named is a record that claims it.
  const named = new Set();
  for (const [ch, n] of [["statesenate", 31], ["statehouse", 150]]) {
    for (let d = 1; d <= n; d++) {
      const pid = W._pdxStateLegSeat("Texas", ch, d);
      if (!pid) continue;
      named.add(pid);
      eq(W.pdxSeatClaim(pid, ch, d) === "mismatch", false, `roster: ${pid} was seated in ${ch} ${d}, a seat its record contradicts`);
      const rec = W.CMP_DATA[pid];
      ok(rec && String(rec.state).indexOf("Texas") === 0, `roster: ${pid} is not a Texas record`);
      ok(rec && new RegExp("^(SD|HD)?\\s*" + d + "$").test(String(rec.district || "").trim()), `roster: ${pid}'s record does not name district ${d}`);
    }
  }
  eq(JSON.stringify([...named].sort()), JSON.stringify(["bettencourt_tx", "gutierrez_tx", "paxton_tx"]),
    "roster: the set of Texas legislators the lookup can name is not exactly the district-keyed records on file");
  eq(W._pdxStateLegSeat("Texas", "statesenate", 1), null, "roster: a member with no district on their record was placed in SD 1");
  eq(W._pdxStateLegSeat("Texas", "statehouse", 7), null, "roster: a State Senate record (SD 7) was seated in State House 7");
  eq(W._pdxStateLegSeat("Louisiana", "statesenate", 7), null, "roster: an unmapped state resolved a legislator");

  // A Texas reader who has not pinned the legislative seats yet: mapped, blank, no number.
  const N = boot({ state: "Texas", city: "Houston", county: "Harris County", district: "7" });
  const nl = levelOf(N, "statehouse");
  eq(nl.district, null, "unpinned: a State House number appeared out of nothing");
  eq(nl.pid, null, "unpinned: a State House member appeared out of nothing");
  has(band(N), "set your address in the district finder", "unpinned: the row does not point at the finder that would fill it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · Utah's legislative resolution is identical to HEAD's");
// ═════════════════════════════════════════════════════════════════════════════
{
  const headVhl = HEAD("voter-hub-location.js");
  const UT_LOCS = [
    { state: "Utah", city: "Layton", county: "Davis County", district: "2", stateHouseDistrict: "16", stateSenateDistrict: "7", mapSelected: true },
    { state: "Utah", city: "Provo", county: "Utah County", district: "3" },
    { state: "Utah", city: "Vernal", county: "Uintah County", district: "3", stateHouseDistrict: "68", stateSenateDistrict: "26", mapSelected: true },
    { state: "Utah" },
  ];
  for (const loc of UT_LOCS) {
    const now = boot(Object.assign({}, loc)).pdxRepsForMe();
    eq(now.legislativeMapped, true, `utah: ${loc.city || "state-only"} is not legislatively mapped`);
    if (!headVhl) continue;
    const was = boot(Object.assign({}, loc), { "voter-hub-location.js": headVhl }).pdxRepsForMe();
    const pick = (r) => JSON.stringify(r.levels.map((l) => [l.key, l.district, l.pid, l.mapped]));
    eq(pick(now), pick(was), `utah: ${loc.city || "state-only"}'s levels changed`);
    eq(now.districtsResolvable, was.districtsResolvable, `utah: ${loc.city || "state-only"}'s districtsResolvable changed`);
  }
  // And a state that is neither keeps its honest unmapped rows.
  const O = boot({ state: "Louisiana", city: "Baton Rouge", county: "East Baton Rouge Parish", district: "2", stateHouseDistrict: "33", stateSenateDistrict: "17" });
  for (const k of ["statesenate", "statehouse"]) {
    const l = levelOf(O, k);
    eq(l.mapped, false, `louisiana: ${k} claims to be mapped`);
    eq(l.district, null, `louisiana: ${k} carries a stray district number`);
    eq(l.pid, null, `louisiana: ${k} named someone`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// The two lists that say "Texas" agree, and the shell moved.
// ═════════════════════════════════════════════════════════════════════════════
{
  has(R("voter-hub-location.js"), "var _PDX_LEG_MAPPED = { texas: 1, california: 1, florida: 1, 'new york': 1,\n                         illinois: 1, pennsylvania: 1, ohio: 1,\n                         georgia: 1, michigan: 1, 'north carolina': 1,\n                         virginia: 1, washington: 1, arizona: 1,\n                         'new jersey': 1, massachusetts: 1, tennessee: 1,\n                         colorado: 1, maryland: 1, minnesota: 1,\n                         wisconsin: 1, indiana: 1, missouri: 1,\n                         kentucky: 1, alabama: 1, 'south carolina': 1,\n                         iowa: 1, oklahoma: 1, kansas: 1,\n                         nevada: 1, nebraska: 1, arkansas: 1,\n                         oregon: 1, idaho: 1, montana: 1,\n                         'new mexico': 1, wyoming: 1,\n                         mississippi: 1, 'west virginia': 1, hawaii: 1 };", "lists: the resolver's legislative state list changed");
  const SW = R("sw.js");
  const v = Number((SW.match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  ok(v >= 445, `sw: find.html changed and CACHE_VERSION is v${v}`);
  has(SW, "'/find.html',", "sw: find.html is no longer precached");
}

console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  console.error(`\n✗ texas legislative lines: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ texas legislative lines: ${passed} passed — one state's lines at a time, a member only where the roster claims the seat`);
