#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislative-lines-ms-wv-hi.mjs — Mississippi, West Virginia, Hawaii
// ─────────────────────────────────────────────────────────────────────────────
// The TIGERweb legislative list now also draws Mississippi, West Virginia and
// Hawaii: the same 2024 layers (5 upper, 6 lower), the same one-state-by-FIPS
// query, loaded only after a geocode has named the state. All three have two
// chambers. (West Virginia elects two senators from each of its 17 Senate
// districts; the seat is still keyed by the district number TIGERweb gives.)
//
// What it pins:
//
//   1. THE FINDER OPENS EMPTY in each state, even on a saved record.
//   2. AN ADDRESS IN EACH STATE RESOLVES BOTH CHAMBERS from that state's lines,
//      and every TIGERweb request names that state's FIPS and no other.
//   3. THE CARD NAMES A MEMBER ONLY WHERE THE ROSTER CLAIMS THE SEAT. The roster
//      holds no district-keyed legislator in any of the three today, so every seat
//      reads "District N — no member on file yet". A test-only roster record
//      (added in memory, never written) proves an exact in-office match is
//      named, and that a former or neighbouring record is not.
//   4. THE THIRTY-SEVEN STATES ALREADY MAPPED ARE UNCHANGED against HEAD's
//      resolver, Nebraska is still the one one-chamber state, and a named
//      senator in each TIGERweb state is still named.
//   5. NO EQUITY LANGUAGE in anything this pass painted or changed, and the
//      shell moved.
//
//   node scripts/test-state-legislative-lines-ms-wv-hi.mjs

// boot() is the roster without the whole-state passes' shells (see
// state-leg-harness.mjs): this suite pins the lines and the empty-seat rule;
// test-ms-vt-mi-tn-deepen.mjs pins the members now on file.
import { R, HEAD, MAP, sq, driveFinder, bootWithoutWholeStateShells as boot, levelOf, band, tigerUrls, layerOf } from "./state-leg-harness.mjs";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ ms/wv/hi legislative lines: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

// The finder's page carries voter-hub-location.js, which owns the seat-label
// tables; the finder harness does not, so it is handed the real ones.
const RES = boot({ state: "Mississippi" });
must(typeof RES.pdxLegDistrictKey === "function", "the resolver's lettered tables did not load");
const withNames = (F) => {
  for (const k of ["pdxLegDistrictName", "pdxLegDistrictsNamed", "pdxLegChamberNamed", "pdxLegDistrictKey"]) F.win[k] = RES[k];
  return F;
};
const KEY = (st, ch, code) => String(RES.pdxLegDistrictKey(st, ch, code));
// Real points, and what TIGERweb's 2024 layers give for them. `sk`/`hk` are the
// record keys; `sChip`/`hChip` are what the finder's chips must read.
const PLACES = [
  { state: "Mississippi", fips: "28", city: "Jackson", county: "Hinds", lat: 32.3036, lng: -90.1825,
    name: "400 High St, Jackson, MS 39201", sd: "029", hd: "067", cd: "02", sChip: "District 29", hChip: "District 67" },
  { state: "West Virginia", fips: "54", city: "Charleston", county: "Kanawha", lat: 38.3365, lng: -81.6123,
    name: "1900 Kanawha Blvd E, Charleston, WV 25305", sd: "008", hd: "054", cd: "01", sChip: "District 8", hChip: "District 54" },
  { state: "Hawaii", fips: "15", city: "Honolulu", county: "Honolulu", lat: 21.3073, lng: -157.8573,
    name: "415 S Beretania St, Honolulu, HI 96813", sd: "013", hd: "025", cd: "01", sChip: "District 13", hChip: "District 25" },
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
  for (const st of ["Mississippi", "West Virginia", "Hawaii"]) eq(RES.pdxLegUnicameral(st), false, `${st} is treated as one-chamber`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the card names a member only where the roster claims the seat");
// ═════════════════════════════════════════════════════════════════════════════
const at = (p, sd, hd) => ({ state: p.state, city: p.city, county: p.county + " County", district: p.cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const [MS, WV, HI] = PLACES;
for (const [P, sd, hd] of [[MS, "29", "67"], [WV, "8", "54"], [HI, "13", "25"]]) {
  // Nobody on file in either chamber: the rows say so and name nobody.
  const W = boot(at(P, sd, hd));
  eq(W.pdxRepsForMe().legislativeMapped, true, `${P.state}: not legislatively mapped`);
  eq(levelOf(W, "statesenate").pid, null, `${P.state} SD ${sd}: a member was invented`);
  eq(levelOf(W, "statehouse").pid, null, `${P.state} HD ${hd}: a member was invented`);
  eq(levelOf(W, "statesenate").district, sd, `${P.state}: the State Senate district did not reach the level`);
  eq(levelOf(W, "statehouse").district, hd, `${P.state}: the State House district did not reach the level`);
  const out = band(W);
  has(out, `District ${sd} — no member on file yet`, `${P.state} SD ${sd}: the row does not say nobody is on file`);
  has(out, `District ${hd} — no member on file yet`, `${P.state} HD ${hd}: the row does not say nobody is on file`);
  lacks(out, "only maps state legislative districts in", `${P.state}: the reader is told their lines are not drawn`);
  ok(!EQUITY.test(out.replace(/<[^>]+>/g, " ")), `${P.state}: the card carries equity language`);
  eq(W.pdxRepsForMe().levels.length, 6, `${P.state}: the card does not count six seats`);
}
{
  // A ROSTER MATCH IS NAMED, AND ONLY AN EXACT ONE. Test-only records, added to
  // this sandbox's roster and nowhere else.
  const W = boot(at(MS, "29", "67"));
  W.CMP_DATA.fixture_ms_sd29 = { name: "Fixture Senator", state: "Mississippi", office: "Mississippi State Senator", district: "SD 29" };
  W.CMP_DATA.fixture_ms_former = { name: "Fixture Former", state: "Mississippi", office: "Former Mississippi State Representative", district: "HD 67" };
  // West Virginia's lower chamber is the House of Delegates. The resolver reads
  // the chamber off "State" plus "House"/"Senate" in the office, the same rule
  // every mapped state uses, so a record titled that way is the one it seats.
  W.CMP_DATA.fixture_wv_hd54 = { name: "Fixture Delegate", state: "West Virginia", office: "Member, West Virginia State House of Delegates", district: "HD 54" };
  W.CMP_DATA.fixture_hi_sd13 = { name: "Fixture Hawaii Senator", state: "Hawaii", office: "Hawaii State Senator", district: "SD 13" };
  eq(W._pdxStateLegSeat("Mississippi", "statesenate", 29), "fixture_ms_sd29", "Mississippi SD 29: a matching roster record is not named");
  eq(levelOf(W, "statesenate").pid, "fixture_ms_sd29", "Mississippi SD 29: the card row does not carry the matching member");
  has(band(W), "Fixture Senator", "Mississippi SD 29: the matching member is not on the card");
  eq(W._pdxStateLegSeat("Mississippi", "statesenate", 28), null, "Mississippi SD 28: a neighbouring seat borrowed SD 29's member");
  eq(W._pdxStateLegSeat("Mississippi", "statehouse", 29), null, "Mississippi HD 29: a senator was seated in the other chamber");
  eq(W._pdxStateLegSeat("Mississippi", "statehouse", 67), null, "Mississippi HD 67: a former member was seated");
  eq(levelOf(W, "statehouse").pid, null, "Mississippi HD 67: a member was invented");
  eq(W._pdxStateLegSeat("Hawaii", "statesenate", 13), "fixture_hi_sd13", "Hawaii SD 13: a matching roster record is not named");
  eq(W._pdxStateLegSeat("Hawaii", "statesenate", 12), null, "Hawaii SD 12: a neighbouring seat borrowed SD 13's member");
  eq(W._pdxStateLegSeat("West Virginia", "statehouse", 54), "fixture_wv_hd54", "West Virginia HD 54: a matching roster record is not named");
  eq(W._pdxStateLegSeat("West Virginia", "statehouse", 53), null, "West Virginia HD 53: a neighbouring seat borrowed HD 54's member");
}
{
  // Every seat in every chamber these states have, against the real roster.
  const W = boot(at(MS, "1", "1"));
  const named = [];
  for (const [st, nSen, nLow] of [["Mississippi", 52, 122], ["West Virginia", 17, 100], ["Hawaii", 25, 51]]) {
    for (const [ch, max] of [["statesenate", nSen], ["statehouse", nLow]]) {
      for (let d = 1; d <= max; d++) { const pid = W._pdxStateLegSeat(st, ch, d); if (pid) named.push(`${st} ${ch} ${d}: ${pid}`); }
    }
  }
  eq(JSON.stringify(named), "[]", "roster: a legislator was named in Mississippi, West Virginia or Hawaii with no district-keyed record on file");
  for (const p of ["wicker", "capito"]) for (const [st, ch, d] of [["Mississippi", "statesenate", 1], ["West Virginia", "statesenate", 1]])
    ok(W._pdxStateLegSeat(st, ch, d) !== p, `roster: ${p} was placed in a legislative seat`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the thirty-seven states already mapped are identical to HEAD's");
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
                               ["Nevada", "8", "marilyn_dondero_loop"], ["Oregon", "19", "rob_wagner"]]) {
    eq(levelOf(boot(LOC(st, sd)), "statesenate").pid, pid, `${st} SD ${sd} stopped naming its member`);
  }
  // Nebraska still has no State House row.
  eq(levelOf(boot(LOC("Nebraska", "28")), "statehouse"), null, "Nebraska grew a State House row");
  // The two new states changed: before this pass they were unmapped. (Once
  // this pass is committed HEAD maps them too, so the baseline half only runs
  // while HEAD still lacks them.)
  for (const st of ["Mississippi", "West Virginia", "Hawaii"]) {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: "19", stateHouseDistrict: "19", mapSelected: true };
    if (headVhl.indexOf("hawaii: 1") < 0)
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
  console.error(`\n✗ ms/wv/hi legislative lines: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ ms/wv/hi legislative lines: ${passed} passed — three more states' lines, one state at a time, a member only where the roster claims the seat`);
