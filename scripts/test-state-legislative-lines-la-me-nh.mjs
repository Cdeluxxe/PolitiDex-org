#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislative-lines-la-me-nh.mjs — Louisiana, Maine, New Hampshire
// ─────────────────────────────────────────────────────────────────────────────
// The TIGERweb legislative list now also draws Louisiana, Maine and New
// Hampshire: the same 2024 layers (5 upper, 6 lower), the same one-state-by-
// FIPS query, loaded only after a geocode has named the state. All three have
// two chambers. NEW HAMPSHIRE'S HOUSE SEATS ARE COUNTY-NAMED ("Merrimack 18"):
// the number repeats in every county, so — as for Maryland's lettered seats —
// TIGERweb's code ("618") is looked up to a plain key and the seat is shown by
// its name. Its Senate is numbered.
//
// What it pins:
//
//   1. THE FINDER OPENS EMPTY in each state, even on a saved record.
//   2. AN ADDRESS IN EACH STATE RESOLVES BOTH CHAMBERS from that state's lines,
//      and every TIGERweb request names that state's FIPS and no other.
//   3. THE CARD NAMES A MEMBER where the roster claims the seat (Louisiana's
//      and New Hampshire's district-keyed senators) and reads "District N — no
//      member on file yet" where it does not. A New Hampshire House seat reads
//      by its name. Nobody is invented.
//   4. THE FORTY STATES ALREADY MAPPED ARE UNCHANGED against HEAD's resolver,
//      Nebraska is still the one one-chamber state, and a named senator in each
//      TIGERweb state is still named.
//   5. NO EQUITY LANGUAGE in anything this pass painted or changed, and the
//      shell moved.
//
//   node scripts/test-state-legislative-lines-la-me-nh.mjs

import { R, HEAD, MAP, sq, driveFinder, boot, levelOf, band, tigerUrls, layerOf } from "./state-leg-harness.mjs";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ la/me/nh legislative lines: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

// The finder's page carries voter-hub-location.js, which owns the seat-label
// tables; the finder harness does not, so it is handed the real ones.
const RES = boot({ state: "Louisiana" });
must(typeof RES.pdxLegDistrictKey === "function", "the resolver's lettered tables did not load");
const withNames = (F) => {
  for (const k of ["pdxLegDistrictName", "pdxLegDistrictsNamed", "pdxLegChamberNamed", "pdxLegDistrictKey"]) F.win[k] = RES[k];
  return F;
};
const KEY = (st, ch, code) => String(RES.pdxLegDistrictKey(st, ch, code));
// Real points, and what TIGERweb's 2024 layers give for them. `sk`/`hk` are the
// record keys; `sChip`/`hChip` are what the finder's chips must read.
const PLACES = [
  { state: "Louisiana", fips: "22", city: "Baton Rouge", county: "East Baton Rouge", lat: 30.4571, lng: -91.1874,
    name: "900 N 3rd St, Baton Rouge, LA 70802", sd: "014", hd: "067", cd: "06", sChip: "District 14", hChip: "District 67" },
  { state: "Maine", fips: "23", city: "Augusta", county: "Kennebec", lat: 44.3072, lng: -69.7817,
    name: "210 State St, Augusta, ME 04330", sd: "015", hd: "059", cd: "02", sChip: "District 15", hChip: "District 59" },
  // County-named House seat: TIGERweb's SLDL 618 is "Merrimack 18".
  { state: "New Hampshire", fips: "33", city: "Concord", county: "Merrimack", lat: 43.2067, lng: -71.5381,
    name: "107 N Main St, Concord, NH 03301", sd: "015", hd: "618", cd: "02", sChip: "District 15", hChip: "Merrimack 18" },
];
for (const p of PLACES) { p.sk = KEY(p.state, "statesenate", p.sd); p.hk = p.hd ? KEY(p.state, "statehouse", p.hd) : ""; }
const box = (p, props) => [sq(p.lng - 0.2, p.lat - 0.2, p.lng + 0.2, p.lat + 0.2, props)];
const tigerFor = (p) => ({
  4: { features: box(p, { CD119: p.cd }), point: { CD119: p.cd } },
  5: { features: box(p, { SLDU: p.sd }), point: { SLDU: p.sd } },
  6: { features: box(p, { SLDL: p.hd }), point: { SLDL: p.hd } },
});
const n = (s) => String(Math.max(1, parseInt(s, 10)));


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
  eq(F.chip("senate"), p.sChip, `${p.state}: the saved State Senate district is not seeded`);
  eq(F.chip("house"), p.hChip, `${p.state}: the saved State House district is not seeded`);
  eq(F.els["pdx-layer-house"].style.display, "", `${p.state}: the State House toggle is hidden`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · an address in each state resolves its legislative seats");
// ═════════════════════════════════════════════════════════════════════════════
for (const p of PLACES) {
  const F = withNames(await driveFinder({ state: p.state, hit: { lat: p.lat, lng: p.lng, name: p.name, city: p.city, county: p.county, state: p.state }, tiger: tigerFor(p) }));
  eq(F.wire.length, 0, `${p.state}: something was fetched before the search`);
  await F.search(p.name);
  eq(F.chip("senate"), p.sChip, `${p.state}: the State Senate district did not resolve`);
  eq(F.chip("house"), p.hChip, `${p.state}: the State House district did not resolve`);
  eq(F.chip("congress"), "District " + n(p.cd), `${p.state}: the U.S. House district stopped resolving`);
  has(F.els["pdx-map-missing"].textContent, "All three districts set", `${p.state}: the bar does not call the answer complete`);
  const loc = F.win._currentVoterLocation;
  eq(loc.state, p.state, `${p.state}: the record is not stamped with the state`);
  eq(loc.stateSenateDistrict, p.sk, `${p.state}: the State Senate key did not reach the record`);
  eq(loc.stateHouseDistrict, p.hk, `${p.state}: the State House key did not reach the record`);
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
  has(MAP, "var LEG_UNICAMERAL = { 'Nebraska': 1 };", "source: Nebraska is not the one one-chamber state in the finder");
  has(R("voter-hub-location.js"), "var _PDX_LEG_UNICAMERAL = { nebraska: 1 };", "source: Nebraska is not the one one-chamber state in the resolver");
  for (const st of ["Louisiana", "Maine", "New Hampshire"]) eq(RES.pdxLegUnicameral(st), false, `${st} is treated as one-chamber`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the card names a member only where the roster claims the seat");
// ═════════════════════════════════════════════════════════════════════════════
const at = (p, sd, hd) => ({ state: p.state, city: p.city, county: p.county + " County", district: p.cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const [LA, ME, NH] = PLACES;
const NH_MERR18 = KEY("New Hampshire", "statehouse", "618");
{
  // New Hampshire's House: the code is a key, the key is a name, and the name
  // is what is shown — never "District 618" or "District N" for the key.
  ok(Number(NH_MERR18) > 0, "New Hampshire: SLDL 618 has no key");
  eq(RES.pdxLegDistrictName("New Hampshire", "statehouse", NH_MERR18), "Merrimack 18", "New Hampshire: key does not name Merrimack 18");
  eq(RES.pdxLegDistrictText("New Hampshire", "statesenate", "15"), "District 15", "New Hampshire: the Senate is not numbered");
  eq(RES.pdxLegChamberNamed("New Hampshire", "statesenate"), false, "New Hampshire: the Senate reads as named");
  eq(RES.pdxLegChamberNamed("New Hampshire", "statehouse"), true, "New Hampshire: the House does not read as named");
  eq(Number(KEY("New Hampshire", "statehouse", "ZZZ")), 0, "New Hampshire: the undefined-water code became a seat");
  eq(Number(KEY("New Hampshire", "statehouse", "999")), 0, "New Hampshire: an unknown code became a seat");
  const keys = new Set();
  for (const c of ["001", "107", "618", "906"]) keys.add(KEY("New Hampshire", "statehouse", c));
  eq(keys.size, 4, "New Hampshire: two House codes share a key");
  eq(RES.pdxLegDistrictName("New Hampshire", "statehouse", KEY("New Hampshire", "statehouse", "906")), "Sullivan 6", "New Hampshire: the last code does not name Sullivan 6");
  // The named and coded tables did not change for the states that already had them.
  eq(RES.pdxLegChamberNamed("Maryland", "statehouse"), true, "Maryland: the House stopped reading as lettered");
  eq(RES.pdxLegDistrictName("Maryland", "statehouse", KEY("Maryland", "statehouse", "30A")), "District 30A", "Maryland: 30A moved");
  eq(RES.pdxLegDistrictName("Minnesota", "statehouse", KEY("Minnesota", "statehouse", "59B")), "District 59B", "Minnesota: 59B moved");
  for (const st of ["Louisiana", "Maine"]) eq(RES.pdxLegDistrictsNamed(st), false, `${st}: its seats read as named`);
}
{
  // Louisiana: the three senators on file, and an unclaimed House seat.
  for (const [sd, pid] of [["9", "cameron_henry"], ["27", "jeremy_stine"], ["5", "royce_duplessis"]]) {
    const W = boot(at(LA, sd, "67"));
    const ss = levelOf(W, "statesenate"), sh = levelOf(W, "statehouse");
    eq(W.pdxRepsForMe().legislativeMapped, true, "Louisiana: not legislatively mapped");
    eq(ss.district, sd, `Louisiana SD ${sd}: the district did not reach the level`);
    eq(ss.pid, pid, `Louisiana SD ${sd}: the senator on file is not named`);
    eq(sh.pid, null, "Louisiana HD 67: a member was invented");
    const out = band(W);
    has(out, W.CMP_DATA[pid].name, `Louisiana SD ${sd}: the senator is not on the card`);
    has(out, "District 67 — no member on file yet", "Louisiana HD 67: the row does not say nobody is on file");
    lacks(out, "only maps state legislative districts in", "Louisiana: the reader is told their lines are not drawn");
    ok(!EQUITY.test(out.replace(/<[^>]+>/g, " ")), "Louisiana: the card carries equity language");
    eq(W.pdxRepsForMe().levels.length, 6, "Louisiana: the card does not count six seats");
  }
  const W = boot(at(LA, "14", "67"));
  eq(levelOf(W, "statesenate").pid, null, "Louisiana SD 14: a member was invented");
  has(band(W), "District 14 — no member on file yet", "Louisiana SD 14: the row does not say nobody is on file");
}
{
  // New Hampshire: the two senators on file; the House seat reads by its name.
  for (const [sd, pid] of [["19", "regina_birdsell"], ["21", "rebecca_perkins_kwoka"]]) {
    const W = boot(at(NH, sd, NH_MERR18));
    eq(levelOf(W, "statesenate").pid, pid, `New Hampshire SD ${sd}: the senator on file is not named`);
    has(band(W), W.CMP_DATA[pid].name, `New Hampshire SD ${sd}: the senator is not on the card`);
  }
  const W = boot(at(NH, "15", NH_MERR18));
  eq(levelOf(W, "statesenate").pid, null, "New Hampshire SD 15: a member was invented");
  eq(levelOf(W, "statehouse").pid, null, "New Hampshire Merrimack 18: a member was invented");
  const out = band(W), vis = out.replace(/<[^>]+>/g, " ");
  has(out, "District 15 — no member on file yet", "New Hampshire SD 15: the row does not say nobody is on file");
  has(out, "Merrimack 18 — no member on file yet", "New Hampshire Merrimack 18: the row does not say nobody is on file by name");
  lacks(vis, "District " + NH_MERR18 + " ", "New Hampshire: the House seat's internal key was printed as a district number");
  lacks(out, "only maps state legislative districts in", "New Hampshire: the reader is told their lines are not drawn");
  ok(!EQUITY.test(vis), "New Hampshire: the card carries equity language");
  eq(W.pdxRepsForMe().levels.length, 6, "New Hampshire: the card does not count six seats");
}
{
  // Maine: nobody on file in either chamber.
  const W = boot(at(ME, "15", "59"));
  eq(W.pdxRepsForMe().legislativeMapped, true, "Maine: not legislatively mapped");
  eq(levelOf(W, "statesenate").pid, null, "Maine SD 15: a member was invented");
  eq(levelOf(W, "statehouse").pid, null, "Maine HD 59: a member was invented");
  const out = band(W);
  has(out, "District 15 — no member on file yet", "Maine SD 15: the row does not say nobody is on file");
  has(out, "District 59 — no member on file yet", "Maine HD 59: the row does not say nobody is on file");
  ok(!EQUITY.test(out.replace(/<[^>]+>/g, " ")), "Maine: the card carries equity language");
  eq(W.pdxRepsForMe().levels.length, 6, "Maine: the card does not count six seats");
}
{
  // A named New Hampshire House record is seated by its name and nowhere else.
  // Test-only records, added to this sandbox's roster and nowhere else.
  const W = boot(at(NH, "15", NH_MERR18));
  W.CMP_DATA.fixture_nh_merr18 = { name: "Fixture Representative", state: "New Hampshire", office: "New Hampshire State Representative", district: "Merrimack District 18" };
  W.CMP_DATA.fixture_nh_former = { name: "Fixture Former", state: "New Hampshire", office: "Former New Hampshire State Representative", district: "Merrimack 17" };
  eq(W._pdxStateLegSeat("New Hampshire", "statehouse", NH_MERR18), "fixture_nh_merr18", "New Hampshire Merrimack 18: a matching roster record is not named");
  has(band(W), "Fixture Representative", "New Hampshire Merrimack 18: the matching member is not on the card");
  eq(W._pdxStateLegSeat("New Hampshire", "statehouse", KEY("New Hampshire", "statehouse", "617")), null, "New Hampshire Merrimack 17: a former member was seated");
  eq(W._pdxStateLegSeat("New Hampshire", "statehouse", KEY("New Hampshire", "statehouse", "418")), null, "New Hampshire Hillsborough 18: the same number in another county was seated");
  eq(W._pdxStateLegSeat("New Hampshire", "statesenate", 18), null, "New Hampshire SD 18: a House record was seated in the Senate");
}
{
  // Every seat in every chamber these states have, against the real roster.
  const W = boot(at(LA, "1", "1"));
  const named = new Set();
  for (const [st, nSen, nLow] of [["Louisiana", 39, 105], ["Maine", 35, 151], ["New Hampshire", 24, 164]]) {
    for (const [ch, max] of [["statesenate", nSen], ["statehouse", nLow]]) {
      for (let d = 1; d <= max; d++) {
        const pid = W._pdxStateLegSeat(st, ch, d);
        if (!pid) continue;
        named.add(pid);
        const rec = W.CMP_DATA[pid];
        ok(rec && String(rec.state).indexOf(st) === 0, `roster: ${pid} is not a ${st} record`);
        ok(rec && /\bstate\b/i.test(String(rec.office || "")) && !/\bformer\b|\bcandidate\b/i.test(String(rec.office || "")), `roster: ${pid} is not an in-office state legislator`);
        if (ch === "statesenate") ok(rec && new RegExp("^(SD)?\\s*" + d + "$").test(String(rec.district || "").trim()), `roster: ${pid}'s record does not name SD ${d}`);
      }
    }
  }
  eq(JSON.stringify([...named].sort()), JSON.stringify(["cameron_henry", "jeremy_stine", "rebecca_perkins_kwoka", "regina_birdsell", "royce_duplessis"]),
    "roster: the members the lookup can name are not exactly the district-keyed state legislators on file");
  for (const p of ["ryan_fecteau", "phillip_devillier", "sharon_carson", "cassidy", "shaheen", "collins", "angus_king"]) ok(!named.has(p), `roster: ${p} was placed in a legislative seat`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the forty states already mapped are identical to HEAD's");
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
    { state: "Wisconsin", city: "Madison", county: "Dane County", district: "2", stateSenateDistrict: "26", stateHouseDistrict: "76", mapSelected: true },
    { state: "Wisconsin", city: "Madison", county: "Dane County", district: "2", stateSenateDistrict: "27", stateHouseDistrict: "79", mapSelected: true },
    { state: "Indiana", city: "Indianapolis", county: "Marion County", district: "7", stateSenateDistrict: "46", stateHouseDistrict: "97", mapSelected: true },
    { state: "Indiana", city: "Bloomington", county: "Monroe County", district: "9", stateSenateDistrict: "40", stateHouseDistrict: "61", mapSelected: true },
    { state: "Missouri", city: "Jefferson City", county: "Cole County", district: "3", stateSenateDistrict: "6", stateHouseDistrict: "60", mapSelected: true },
    { state: "Missouri", city: "Columbia", county: "Boone County", district: "3", stateSenateDistrict: "18", stateHouseDistrict: "44", mapSelected: true },
    { state: "Kentucky", city: "Louisville", county: "Jefferson County", district: "3", stateSenateDistrict: "33", stateHouseDistrict: "43", mapSelected: true },
    { state: "Alabama", city: "Montgomery", county: "Montgomery County", district: "2", stateSenateDistrict: "26", stateHouseDistrict: "77", mapSelected: true },
    { state: "Alabama", city: "Birmingham", county: "Jefferson County", district: "7", stateSenateDistrict: "24", stateHouseDistrict: "54", mapSelected: true },
    { state: "South Carolina", city: "Columbia", county: "Richland County", district: "6", stateSenateDistrict: "26", stateHouseDistrict: "72", mapSelected: true },
    { state: "South Carolina", city: "Georgetown", county: "Georgetown County", district: "7", stateSenateDistrict: "25", stateHouseDistrict: "103", mapSelected: true },
    { state: "Iowa", city: "Des Moines", county: "Polk County", district: "3", stateSenateDistrict: "18", stateHouseDistrict: "36", mapSelected: true },
    { state: "Oklahoma", city: "Oklahoma City", county: "Oklahoma County", district: "5", stateSenateDistrict: "46", stateHouseDistrict: "92", mapSelected: true },
    { state: "Kansas", city: "Topeka", county: "Shawnee County", district: "2", stateSenateDistrict: "19", stateHouseDistrict: "57", mapSelected: true },
    { state: "Nevada", city: "Las Vegas", county: "Clark County", district: "1", stateSenateDistrict: "8", stateHouseDistrict: "11", mapSelected: true },
    { state: "Nevada", city: "Las Vegas", county: "Clark County", district: "1", stateSenateDistrict: "2", stateHouseDistrict: "11", mapSelected: true },
    { state: "Nebraska", city: "Lincoln", county: "Lancaster County", district: "1", stateSenateDistrict: "28", stateHouseDistrict: "36", mapSelected: true },
    { state: "Arkansas", city: "Little Rock", county: "Pulaski County", district: "2", stateSenateDistrict: "14", stateHouseDistrict: "74", mapSelected: true },
    { state: "Oregon", city: "Lake Oswego", county: "Clackamas County", district: "5", stateSenateDistrict: "19", stateHouseDistrict: "38", mapSelected: true },
    { state: "Oregon", city: "Portland", county: "Multnomah County", district: "3", stateSenateDistrict: "17", stateHouseDistrict: "33", mapSelected: true },
    { state: "Idaho", city: "Boise", county: "Ada County", district: "2", stateSenateDistrict: "19", stateHouseDistrict: "19", mapSelected: true },
    { state: "Montana", city: "Helena", county: "Lewis and Clark County", district: "2", stateSenateDistrict: "41", stateHouseDistrict: "82", mapSelected: true },
    { state: "New Mexico", city: "Santa Fe", county: "Santa Fe County", district: "3", stateSenateDistrict: "25", stateHouseDistrict: "47", mapSelected: true },
    { state: "Wyoming", city: "Cheyenne", county: "Laramie County", district: "1", stateSenateDistrict: "8", stateHouseDistrict: "11", mapSelected: true },
    { state: "Mississippi", city: "Jackson", county: "Hinds County", district: "2", stateSenateDistrict: "29", stateHouseDistrict: "67", mapSelected: true },
    { state: "West Virginia", city: "Charleston", county: "Kanawha County", district: "1", stateSenateDistrict: "8", stateHouseDistrict: "54", mapSelected: true },
    { state: "Hawaii", city: "Honolulu", county: "Honolulu County", district: "1", stateSenateDistrict: "13", stateHouseDistrict: "25", mapSelected: true },
    { state: "Connecticut", city: "Hartford", county: "Hartford County", district: "2", stateSenateDistrict: "17", stateHouseDistrict: "33" },
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
                               ["Colorado", "6", "cleave_simpson"], ["Maryland", "39", "nancy_king"], ["Minnesota", "59", "bobby_joe_champion"],
                               ["Wisconsin", "27", "dianne_hesselbein"], ["Indiana", "40", "shelli_yoder"], ["Missouri", "18", "cindy_olaughlin"],
                               ["Kentucky", "33", "gerald_neal"], ["Alabama", "24", "bobby_singleton"], ["South Carolina", "25", "shane_massey"],
                               ["Nevada", "8", "marilyn_dondero_loop"], ["Oregon", "19", "rob_wagner"]]) {
    eq(levelOf(boot(LOC(st, sd)), "statesenate").pid, pid, `${st} SD ${sd} stopped naming its member`);
  }
  // Nebraska still has no State House row.
  eq(levelOf(boot(LOC("Nebraska", "28")), "statehouse"), null, "Nebraska grew a State House row");
  // The two new states changed: before this pass they were unmapped. (Once
  // this pass is committed HEAD maps them too, so the baseline half only runs
  // while HEAD still lacks them.)
  for (const st of ["Louisiana", "Maine"]) {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: "19", stateHouseDistrict: "19", mapSelected: true };
    if (headVhl.indexOf("maine: 1") < 0)
      eq(levelOf(boot(Object.assign({}, loc), { "voter-hub-location.js": headVhl }), "statesenate").mapped, false, `${st}: HEAD already mapped it`);
    eq(levelOf(boot(Object.assign({}, loc)), "statesenate").mapped, true, `${st}: the State Senate seat is not mapped`);
  }
  const O = boot(LOC("Connecticut", "17"));
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
  console.error(`\n✗ la/me/nh legislative lines: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ la/me/nh legislative lines: ${passed} passed — three more states' lines, one state at a time, a member only where the roster claims the seat`);
