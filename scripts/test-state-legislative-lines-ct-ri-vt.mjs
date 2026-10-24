#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislative-lines-ct-ri-vt.mjs — Connecticut, Rhode Island, Vermont
// ─────────────────────────────────────────────────────────────────────────────
// The TIGERweb legislative list now also draws Connecticut, Rhode Island and
// Vermont: the same 2024 layers (5 upper, 6 lower), the same one-state-by-FIPS
// query, loaded only after a geocode has named the state. All three have two
// chambers. VERMONT NAMES BOTH: its Senate districts are counties
// ("Washington"), its House districts a county and a number ("Washington-4"),
// and TIGERweb codes both with letters ("WAS", "WA4"). As for New Hampshire's
// House, each code is looked up to a plain key and the seat is shown by name.
//
// What it pins:
//
//   1. THE FINDER OPENS EMPTY in each state, even on a saved record.
//   2. AN ADDRESS IN EACH STATE RESOLVES BOTH CHAMBERS from that state's lines,
//      and every TIGERweb request names that state's FIPS and no other.
//   3. THE CARD NAMES A MEMBER where the roster claims the seat (Connecticut's
//      three district-keyed senators) and reads "District N — no member on
//      file yet" where it does not; a Vermont seat reads by its name. Nobody is
//      invented. New Hampshire's county-named House seats are unchanged.
//   4. THE FORTY-THREE STATES ALREADY MAPPED ARE UNCHANGED against HEAD's
//      resolver, Nebraska is still the one one-chamber state, and a named
//      senator in each TIGERweb state is still named.
//   5. NO EQUITY LANGUAGE in anything this pass painted or changed, and the
//      shell moved.
//
//   node scripts/test-state-legislative-lines-ct-ri-vt.mjs

import { R, HEAD, MAP, sq, driveFinder, boot, levelOf, band, tigerUrls, layerOf } from "./state-leg-harness.mjs";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ ct/ri/vt legislative lines: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

// The finder's page carries voter-hub-location.js, which owns the seat-label
// tables; the finder harness does not, so it is handed the real ones.
const RES = boot({ state: "Connecticut" });
must(typeof RES.pdxLegDistrictKey === "function", "the resolver's lettered tables did not load");
const withNames = (F) => {
  for (const k of ["pdxLegDistrictName", "pdxLegDistrictsNamed", "pdxLegChamberNamed", "pdxLegDistrictKey"]) F.win[k] = RES[k];
  return F;
};
const KEY = (st, ch, code) => String(RES.pdxLegDistrictKey(st, ch, code));
// Real points, and what TIGERweb's 2024 layers give for them. `sk`/`hk` are the
// record keys; `sChip`/`hChip` are what the finder's chips must read.
const PLACES = [
  { state: "Connecticut", fips: "09", city: "Hartford", county: "Hartford", lat: 41.7637, lng: -72.6851,
    name: "210 Capitol Ave, Hartford, CT 06106", sd: "001", hd: "007", cd: "01", sChip: "District 1", hChip: "District 7" },
  { state: "Rhode Island", fips: "44", city: "Providence", county: "Providence", lat: 41.8310, lng: -71.4148,
    name: "82 Smith St, Providence, RI 02903", sd: "001", hd: "001", cd: "01", sChip: "District 1", hChip: "District 1" },
  // Both chambers named and letter-coded; the U.S. House seat is at large ("00").
  { state: "Vermont", fips: "50", city: "Montpelier", county: "Washington", lat: 44.2623, lng: -72.5809,
    name: "115 State St, Montpelier, VT 05633", sd: "WAS", hd: "WA4", cd: "00", sChip: "Washington District", hChip: "Washington-4" },
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
  for (const st of ["Connecticut", "Rhode Island", "Vermont"]) eq(RES.pdxLegUnicameral(st), false, `${st} is treated as one-chamber`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the card names a member only where the roster claims the seat");
// ═════════════════════════════════════════════════════════════════════════════
const at = (p, sd, hd) => ({ state: p.state, city: p.city, county: p.county + " County", district: p.cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const [CT, RI, VT] = PLACES;
const VT_WAS = KEY("Vermont", "statesenate", "WAS"), VT_WA4 = KEY("Vermont", "statehouse", "WA4");
{
  // Vermont: every code is a key, every key a name, and the name is shown.
  ok(Number(VT_WAS) > 0 && Number(VT_WA4) > 0, "Vermont: WAS/WA4 have no key");
  eq(RES.pdxLegDistrictName("Vermont", "statesenate", VT_WAS), "Washington District", "Vermont: WAS does not name the Washington Senate district");
  eq(RES.pdxLegDistrictName("Vermont", "statehouse", VT_WA4), "Washington-4", "Vermont: WA4 does not name Washington-4");
  eq(RES.pdxLegChamberNamed("Vermont", "statesenate"), true, "Vermont: the Senate does not read as named");
  eq(RES.pdxLegChamberNamed("Vermont", "statehouse"), true, "Vermont: the House does not read as named");
  eq(Number(KEY("Vermont", "statehouse", "ZZZ")), 0, "Vermont: an undefined code became a seat");
  eq(Number(KEY("Vermont", "statesenate", "XYZ")), 0, "Vermont: an unknown code became a seat");
  const sk = new Set(), hk = new Set();
  for (const c of ["ADD", "BEN", "CHS", "WAS", "WSR"]) sk.add(KEY("Vermont", "statesenate", c));
  for (const c of ["A-1", "WA4", "W-4", "Y-W", "YO2"]) hk.add(KEY("Vermont", "statehouse", c));
  ok(sk.size === 5 && hk.size === 5, "Vermont: two codes share a key");
  eq(RES.pdxLegDistrictName("Vermont", "statehouse", KEY("Vermont", "statehouse", "YO1")), "Windsor-Orange-1", "Vermont: YO1 does not name Windsor-Orange-1");
  for (const st of ["Connecticut", "Rhode Island"]) eq(RES.pdxLegDistrictsNamed(st), false, `${st}: its seats read as named`);
  // New Hampshire's county-named House seats are as they were.
  const NH = KEY("New Hampshire", "statehouse", "618");
  ok(Number(NH) > 0, "New Hampshire: SLDL 618 lost its key");
  eq(RES.pdxLegDistrictName("New Hampshire", "statehouse", NH), "Merrimack 18", "New Hampshire: 618 no longer names Merrimack 18");
  eq(RES.pdxLegChamberNamed("New Hampshire", "statesenate"), false, "New Hampshire: the Senate reads as named");
  eq(RES.pdxLegDistrictName("Maryland", "statehouse", KEY("Maryland", "statehouse", "30A")), "District 30A", "Maryland: 30A moved");
}
{
  // Connecticut: the three senators on file, and an unclaimed House seat.
  for (const [sd, pid] of [["11", "martin_looney"], ["25", "bob_duff"], ["30", "stephen_harding"]]) {
    const W = boot(at(CT, sd, "7"));
    const ss = levelOf(W, "statesenate"), sh = levelOf(W, "statehouse");
    eq(W.pdxRepsForMe().legislativeMapped, true, "Connecticut: not legislatively mapped");
    eq(ss.district, sd, `Connecticut SD ${sd}: the district did not reach the level`);
    eq(ss.pid, pid, `Connecticut SD ${sd}: the senator on file is not named`);
    eq(sh.pid, null, "Connecticut HD 7: a member was invented");
    const out = band(W);
    has(out, W.CMP_DATA[pid].name, `Connecticut SD ${sd}: the senator is not on the card`);
    has(out, "District 7 — no member on file yet", "Connecticut HD 7: the row does not say nobody is on file");
    lacks(out, "only maps state legislative districts in", "Connecticut: the reader is told their lines are not drawn");
    ok(!EQUITY.test(out.replace(/<[^>]+>/g, " ")), "Connecticut: the card carries equity language");
    eq(W.pdxRepsForMe().levels.length, 6, "Connecticut: the card does not count six seats");
  }
  const W = boot(at(CT, "1", "7"));
  eq(levelOf(W, "statesenate").pid, null, "Connecticut SD 1: a member was invented");
  has(band(W), "District 1 — no member on file yet", "Connecticut SD 1: the row does not say nobody is on file");
}
{
  // Rhode Island: nobody on file in either chamber.
  const W = boot(at(RI, "1", "1"));
  eq(W.pdxRepsForMe().legislativeMapped, true, "Rhode Island: not legislatively mapped");
  eq(levelOf(W, "statesenate").pid, null, "Rhode Island SD 1: a member was invented");
  eq(levelOf(W, "statehouse").pid, null, "Rhode Island HD 1: a member was invented");
  const out = band(W);
  ok((out.match(/District 1 — no member on file yet/g) || []).length >= 2, "Rhode Island: both legislative rows do not say nobody is on file");
  ok(!EQUITY.test(out.replace(/<[^>]+>/g, " ")), "Rhode Island: the card carries equity language");
  eq(W.pdxRepsForMe().levels.length, 6, "Rhode Island: the card does not count six seats");
}
{
  // Vermont: nobody on file; both rows read by name, never by the internal key.
  const W = boot(at(VT, VT_WAS, VT_WA4));
  eq(W.pdxRepsForMe().legislativeMapped, true, "Vermont: not legislatively mapped");
  eq(levelOf(W, "statesenate").pid, null, "Vermont Washington: a member was invented");
  eq(levelOf(W, "statehouse").pid, null, "Vermont Washington-4: a member was invented");
  const out = band(W), vis = out.replace(/<[^>]+>/g, " ");
  has(out, "Washington District — no member on file yet", "Vermont Washington: the row does not say nobody is on file by name");
  has(out, "Washington-4 — no member on file yet", "Vermont Washington-4: the row does not say nobody is on file by name");
  lacks(vis, "District " + VT_WAS + " ", "Vermont: the Senate seat's internal key was printed as a district number");
  lacks(vis, "District " + VT_WA4 + " ", "Vermont: the House seat's internal key was printed as a district number");
  ok(!EQUITY.test(vis), "Vermont: the card carries equity language");
  eq(W.pdxRepsForMe().levels.length, 6, "Vermont: the card does not count six seats");
}
{
  // A named Vermont record is seated by its name and nowhere else. Test-only
  // records, added to this sandbox's roster and nowhere else.
  const W = boot(at(VT, VT_WAS, VT_WA4));
  W.CMP_DATA.fixture_vt_was = { name: "Fixture Senator", state: "Vermont", office: "Vermont State Senator", district: "Washington" };
  W.CMP_DATA.fixture_vt_wa4 = { name: "Fixture Representative", state: "Vermont", office: "Vermont State Representative", district: "Washington-4" };
  W.CMP_DATA.fixture_vt_former = { name: "Fixture Former", state: "Vermont", office: "Former Vermont State Representative", district: "Washington-3" };
  eq(W._pdxStateLegSeat("Vermont", "statesenate", VT_WAS), "fixture_vt_was", "Vermont Washington: a matching roster record is not named");
  eq(W._pdxStateLegSeat("Vermont", "statehouse", VT_WA4), "fixture_vt_wa4", "Vermont Washington-4: a matching roster record is not named");
  has(band(W), "Fixture Senator", "Vermont Washington: the matching member is not on the card");
  has(band(W), "Fixture Representative", "Vermont Washington-4: the matching member is not on the card");
  eq(W._pdxStateLegSeat("Vermont", "statehouse", KEY("Vermont", "statehouse", "WA3")), null, "Vermont Washington-3: a former member was seated");
  eq(W._pdxStateLegSeat("Vermont", "statehouse", KEY("Vermont", "statehouse", "WA5")), null, "Vermont Washington-5: a neighbouring seat borrowed Washington-4's member");
  eq(W._pdxStateLegSeat("Vermont", "statehouse", KEY("Vermont", "statehouse", "W-4")), null, "Vermont Windham-4: the same number in another county was seated");
}
{
  // Every seat in every chamber these states have, against the real roster.
  const W = boot(at(CT, "1", "1"));
  const named = new Set();
  for (const [st, nSen, nLow] of [["Connecticut", 36, 151], ["Rhode Island", 38, 75], ["Vermont", 16, 109]]) {
    for (const [ch, max] of [["statesenate", nSen], ["statehouse", nLow]]) {
      for (let d = 1; d <= max; d++) {
        const pid = W._pdxStateLegSeat(st, ch, d);
        if (!pid) continue;
        named.add(pid);
        const rec = W.CMP_DATA[pid];
        ok(rec && String(rec.state).indexOf(st) === 0, `roster: ${pid} is not a ${st} record`);
        ok(rec && /\bstate\b/i.test(String(rec.office || "")) && !/\bformer\b|\bcandidate\b/i.test(String(rec.office || "")), `roster: ${pid} is not an in-office state legislator`);
        if (st !== "Vermont") ok(rec && new RegExp("^(SD|HD)?\\s*" + d + "$").test(String(rec.district || "").trim()), `roster: ${pid}'s record does not name ${ch} ${d}`);
      }
    }
  }
  eq(JSON.stringify([...named].sort()), JSON.stringify(["bob_duff", "martin_looney", "stephen_harding"]),
    "roster: the members the lookup can name are not exactly the district-keyed state legislators on file");
  for (const p of ["reed", "whitehouse"]) ok(!named.has(p), `roster: ${p} was placed in a legislative seat`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the forty-three states already mapped are identical to HEAD's");
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
    { state: "Louisiana", city: "New Orleans", county: "Orleans Parish", district: "2", stateSenateDistrict: "5", stateHouseDistrict: "93", mapSelected: true },
    { state: "Louisiana", city: "Baton Rouge", county: "East Baton Rouge Parish", district: "6", stateSenateDistrict: "14", stateHouseDistrict: "67", mapSelected: true },
    { state: "Maine", city: "Augusta", county: "Kennebec County", district: "2", stateSenateDistrict: "15", stateHouseDistrict: "59", mapSelected: true },
    { state: "New Hampshire", city: "Concord", county: "Merrimack County", district: "2", stateSenateDistrict: "15",
      stateHouseDistrict: String(RES.pdxLegDistrictKey("New Hampshire", "statehouse", "618")), mapSelected: true },
    { state: "New Hampshire", city: "Nashua", county: "Hillsborough County", district: "2", stateSenateDistrict: "19",
      stateHouseDistrict: String(RES.pdxLegDistrictKey("New Hampshire", "statehouse", "418")), mapSelected: true },
    { state: "District of Columbia", city: "Washington", county: "District of Columbia", district: "1", stateSenateDistrict: "17", stateHouseDistrict: "33" },
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
                               ["New York", "12", null /* vacant on the Senate roster since 2026-08-10 */], ["Illinois", "4", "kimberly_lightford"],
                               ["Pennsylvania", "33", "doug_mastriano"], ["Ohio", "2", "theresa_gavarone"],
                               ["Georgia", "22", "harold_jones_ga"], ["Michigan", "8", "mallory_mcmorrow"], ["North Carolina", "17", "sydney_batch"],
                               ["Virginia", "34", "scott_surovell"], ["Washington", "43", "jamie_pedersen"], ["Arizona", "18", "priya_sundareshan"],
                               ["New Jersey", "29", "teresa_ruiz"], ["Massachusetts", "21", "bruce_tarr"], ["Tennessee", "29", "raumesh_akbari"],
                               ["Colorado", "6", "cleave_simpson"], ["Maryland", "39", "nancy_king"], ["Minnesota", "59", "bobby_joe_champion"],
                               ["Wisconsin", "27", "dianne_hesselbein"], ["Indiana", "40", "shelli_yoder"], ["Missouri", "18", "cindy_olaughlin"],
                               ["Kentucky", "33", "gerald_neal"], ["Alabama", "24", "bobby_singleton"], ["South Carolina", "25", "shane_massey"],
                               ["Nevada", "8", "marilyn_dondero_loop"], ["Oregon", "19", "rob_wagner"],
                               ["Louisiana", "5", "royce_duplessis"], ["New Hampshire", "19", "regina_birdsell"]]) {
    eq(levelOf(boot(LOC(st, sd)), "statesenate").pid, pid, `${st} SD ${sd} stopped naming its member`);
  }
  // Nebraska still has no State House row.
  eq(levelOf(boot(LOC("Nebraska", "28")), "statehouse"), null, "Nebraska grew a State House row");
  // The two new states changed: before this pass they were unmapped. (Once
  // this pass is committed HEAD maps them too, so the baseline half only runs
  // while HEAD still lacks them.)
  for (const st of ["Connecticut", "Rhode Island"]) {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: "19", stateHouseDistrict: "19", mapSelected: true };
    if (headVhl.indexOf("vermont: 1") < 0)
      eq(levelOf(boot(Object.assign({}, loc), { "voter-hub-location.js": headVhl }), "statesenate").mapped, false, `${st}: HEAD already mapped it`);
    eq(levelOf(boot(Object.assign({}, loc)), "statesenate").mapped, true, `${st}: the State Senate seat is not mapped`);
  }
  const O = boot(LOC("District of Columbia", "17"));
  eq(levelOf(O, "statehouse").mapped, false, "the District of Columbia's legislative seats claim to be mapped");
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
  console.error(`\n✗ ct/ri/vt legislative lines: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ ct/ri/vt legislative lines: ${passed} passed — three more states' lines, one state at a time, a member only where the roster claims the seat`);
