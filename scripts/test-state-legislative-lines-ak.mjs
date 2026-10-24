#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislative-lines-ak.mjs — Alaska, and with it every state
// ─────────────────────────────────────────────────────────────────────────────
// The TIGERweb legislative list now also draws Alaska: the same 2024 layers
// (5 upper, 6 lower), the same one-state-by-FIPS query, loaded only after a
// geocode has named the state. ALASKA'S SENATE IS LETTERED: twenty seats, A
// through T, coded "00A"–"00T". As for the lettered Houses, each code is looked
// up to a plain key and labelled "District B". The House is numbered 1–40.
//
// What it pins:
//
//   1. THE FINDER OPENS EMPTY in Alaska, even on a saved record.
//   2. AN ALASKA ADDRESS RESOLVES BOTH CHAMBERS from Alaska's lines, and every
//      TIGERweb request names Alaska's FIPS and no other.
//   3. THE CARD NAMES A MEMBER ONLY WHERE THE ROSTER CLAIMS THE SEAT. The roster
//      holds no district-keyed Alaska legislator, so every seat reads
//      "District N — no member on file yet". Test-only roster records (added in
//      memory, never written) prove an exact in-office match is named, and that
//      a former, neighbouring or other-chamber record is not. Every other
//      state's named or lettered seats are unchanged.
//   4. THE FORTY-NINE STATES ALREADY MAPPED ARE UNCHANGED against HEAD's
//      resolver, Nebraska is still the one one-chamber state, and a named
//      senator in each TIGERweb state is still named.
//   5. EVERY STATE HAS LEGISLATIVE LINES: the finder's list and the resolver's
//      list both hold all fifty, and agree.
//   6. NO EQUITY LANGUAGE in anything this pass painted or changed, and the
//      shell moved.
//
//   node scripts/test-state-legislative-lines-ak.mjs

import { R, HEAD, MAP, sq, driveFinder, boot, levelOf, band, tigerUrls, layerOf } from "./state-leg-harness.mjs";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ alaska legislative lines: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

// The finder's page carries voter-hub-location.js, which owns the seat-label
// tables; the finder harness does not, so it is handed the real ones.
const RES = boot({ state: "Alaska" });
must(typeof RES.pdxLegDistrictKey === "function", "the resolver's lettered tables did not load");
const withNames = (F) => {
  for (const k of ["pdxLegDistrictName", "pdxLegDistrictsNamed", "pdxLegChamberNamed", "pdxLegDistrictKey"]) F.win[k] = RES[k];
  return F;
};
const KEY = (st, ch, code) => String(RES.pdxLegDistrictKey(st, ch, code));
// Real points, and what TIGERweb's 2024 layers give for them. `sk`/`hk` are the
// record keys; `sChip`/`hChip` are what the finder's chips must read.
const PLACES = [
  // The U.S. House seat is at large ("00"); the Senate seat is a letter.
  { state: "Alaska", fips: "02", city: "Juneau", county: "Juneau", lat: 58.3019, lng: -134.4197,
    name: "120 4th St, Juneau, AK 99801", sd: "00B", hd: "004", cd: "00", sChip: "District B", hChip: "District 4" },
  { state: "Alaska", fips: "02", city: "Anchorage", county: "Anchorage", lat: 61.2181, lng: -149.9003,
    name: "632 W 6th Ave, Anchorage, AK 99501", sd: "00I", hd: "017", cd: "00", sChip: "District I", hChip: "District 17" },
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
  for (const st of ["Alaska"]) eq(RES.pdxLegUnicameral(st), false, `${st} is treated as one-chamber`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the card names a member only where the roster claims the seat");
// ═════════════════════════════════════════════════════════════════════════════
const at = (p, sd, hd) => ({ state: p.state, city: p.city, county: p.county + " Borough", district: p.cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const [JNU, ANC] = PLACES;
const SK = (code) => KEY("Alaska", "statesenate", code);
const HK = (st, code) => KEY(st, "statehouse", code);
{
  // The lettered Senate: every code is a key, every key a label.
  const keys = new Set("ABCDEFGHIJKLMNOPQRST".split("").map((l) => SK("00" + l)));
  ok(keys.size === 20 && ![...keys].includes("0"), "Alaska: two Senate codes share a key, or one has none");
  eq(RES.pdxLegDistrictName("Alaska", "statesenate", SK("00B")), "District B", "Alaska: 00B is not District B");
  eq(RES.pdxLegDistrictName("Alaska", "statesenate", SK("00T")), "District T", "Alaska: 00T is not District T");
  eq(Number(SK("00U")), 0, "Alaska: a Senate seat exists past T");
  eq(Number(SK("002")), 0, "Alaska: a numbered Senate code became a seat");
  eq(RES.pdxLegChamberNamed("Alaska", "statesenate"), true, "Alaska: the Senate does not read as lettered");
  eq(RES.pdxLegChamberNamed("Alaska", "statehouse"), false, "Alaska: the House reads as lettered");
  eq(RES.pdxLegDistrictText("Alaska", "statehouse", "4"), "District 4", "Alaska: the House is not numbered");
  eq(RES.pdxLegUnicameral("Alaska"), false, "Alaska is treated as one-chamber");
  // Every other state's named or lettered seats are as they were.
  eq(RES.pdxLegDistrictName("New Hampshire", "statehouse", HK("New Hampshire", "618")), "Merrimack 18", "New Hampshire: 618 no longer names Merrimack 18");
  eq(RES.pdxLegDistrictName("Vermont", "statehouse", HK("Vermont", "WA4")), "Washington-4", "Vermont: WA4 no longer names Washington-4");
  eq(RES.pdxLegDistrictName("Vermont", "statesenate", KEY("Vermont", "statesenate", "WAS")), "Washington District", "Vermont: WAS no longer names Washington");
  eq(RES.pdxLegDistrictName("Maryland", "statehouse", HK("Maryland", "30A")), "District 30A", "Maryland: 30A moved");
  eq(RES.pdxLegDistrictName("Minnesota", "statehouse", HK("Minnesota", "59B")), "District 59B", "Minnesota: 59B moved");
  eq(RES.pdxLegDistrictName("North Dakota", "statehouse", HK("North Dakota", "04A")), "District 4A", "North Dakota: 04A moved");
  eq(RES.pdxLegDistrictName("South Dakota", "statehouse", HK("South Dakota", "28B")), "District 28B", "South Dakota: 28B moved");
  eq(RES.pdxLegDistrictName("Massachusetts", "statesenate", "21"), "First Essex and Middlesex District", "Massachusetts: SD 21 moved");
}
for (const [P, sk, sl, hd] of [[JNU, SK("00B"), "District B", "4"], [ANC, SK("00I"), "District I", "17"]]) {
  // Nobody on file in either chamber: the rows say so and name nobody.
  const W = boot(at(P, sk, hd));
  eq(W.pdxRepsForMe().legislativeMapped, true, `${P.city}: not legislatively mapped`);
  eq(levelOf(W, "statesenate").pid, null, `${P.city} ${sl}: a member was invented`);
  eq(levelOf(W, "statehouse").pid, null, `${P.city} HD ${hd}: a member was invented`);
  eq(levelOf(W, "statehouse").district, hd, `${P.city}: the State House district did not reach the level`);
  const out = band(W), vis = out.replace(/<[^>]+>/g, " ");
  has(out, `${sl} — no member on file yet`, `${P.city} ${sl}: the row does not say nobody is on file`);
  has(out, `District ${hd} — no member on file yet`, `${P.city} HD ${hd}: the row does not say nobody is on file`);
  if (String(sk) !== hd) lacks(vis, "District " + sk + " —", `${P.city}: the Senate seat's internal key was printed as a district number`);
  lacks(out, "only maps state legislative districts in", `${P.city}: the reader is told their lines are not drawn`);
  ok(!EQUITY.test(vis), `${P.city}: the card carries equity language`);
  eq(W.pdxRepsForMe().levels.length, 6, `${P.city}: the card does not count six seats`);
}
{
  // A ROSTER MATCH IS NAMED, AND ONLY AN EXACT ONE. Test-only records, added to
  // this sandbox's roster and nowhere else.
  const W = boot(at(JNU, SK("00B"), "4"));
  W.CMP_DATA.fixture_ak_sdb = { name: "Fixture Senator", state: "Alaska", office: "Alaska State Senator", district: "District B" };
  W.CMP_DATA.fixture_ak_hd4 = { name: "Fixture Representative", state: "Alaska", office: "Alaska State Representative", district: "HD 4" };
  W.CMP_DATA.fixture_ak_former = { name: "Fixture Former", state: "Alaska", office: "Former Alaska State Representative", district: "HD 3" };
  eq(W._pdxStateLegSeat("Alaska", "statesenate", SK("00B")), "fixture_ak_sdb", "Alaska District B: a matching roster record is not named");
  eq(levelOf(W, "statesenate").pid, "fixture_ak_sdb", "Alaska District B: the card row does not carry the matching member");
  eq(W._pdxStateLegSeat("Alaska", "statehouse", 4), "fixture_ak_hd4", "Alaska HD 4: a matching roster record is not named");
  const out = band(W);
  has(out, "Fixture Senator", "Alaska District B: the matching member is not on the card");
  has(out, "Fixture Representative", "Alaska HD 4: the matching member is not on the card");
  eq(W._pdxStateLegSeat("Alaska", "statesenate", SK("00C")), null, "Alaska District C: a neighbouring seat borrowed District B's member");
  eq(W._pdxStateLegSeat("Alaska", "statehouse", 5), null, "Alaska HD 5: a neighbouring seat borrowed HD 4's member");
  eq(W._pdxStateLegSeat("Alaska", "statehouse", 3), null, "Alaska HD 3: a former member was seated");
  eq(W._pdxStateLegSeat("Alaska", "statesenate", 4), null, "Alaska: a House record was seated in the Senate");
}
{
  // Every seat in both chambers, against the real roster.
  const W = boot(at(JNU, "1", "1"));
  const named = [];
  for (const [ch, max] of [["statesenate", 20], ["statehouse", 40]]) {
    for (let d = 1; d <= max; d++) { const pid = W._pdxStateLegSeat("Alaska", ch, d); if (pid) named.push(`${ch} ${d}: ${pid}`); }
  }
  eq(JSON.stringify(named), "[]", "roster: an Alaska legislator was named with no district-keyed record on file");
  for (const p of ["nicholas_begich", "murkowski", "sullivan"]) ok(!named.some((x) => x.endsWith(": " + p)), `roster: ${p} was placed in a legislative seat`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the forty-nine states already mapped are identical to HEAD's");
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
    { state: "Connecticut", city: "Hartford", county: "Hartford County", district: "1", stateSenateDistrict: "11", stateHouseDistrict: "7", mapSelected: true },
    { state: "Connecticut", city: "Hartford", county: "Hartford County", district: "1", stateSenateDistrict: "1", stateHouseDistrict: "7", mapSelected: true },
    { state: "Rhode Island", city: "Providence", county: "Providence County", district: "1", stateSenateDistrict: "1", stateHouseDistrict: "1", mapSelected: true },
    { state: "Vermont", city: "Montpelier", county: "Washington County", district: "1",
      stateSenateDistrict: String(RES.pdxLegDistrictKey("Vermont", "statesenate", "WAS")),
      stateHouseDistrict: String(RES.pdxLegDistrictKey("Vermont", "statehouse", "WA4")), mapSelected: true },
    { state: "Delaware", city: "Dover", county: "Kent County", district: "1", stateSenateDistrict: "17", stateHouseDistrict: "32", mapSelected: true },
    { state: "North Dakota", city: "New Town", county: "Mountrail County", district: "1", stateSenateDistrict: "4",
      stateHouseDistrict: String(RES.pdxLegDistrictKey("North Dakota", "statehouse", "04A")), mapSelected: true },
    { state: "South Dakota", city: "Pierre", county: "Hughes County", district: "1", stateSenateDistrict: "24",
      stateHouseDistrict: String(RES.pdxLegDistrictKey("South Dakota", "statehouse", "024")), mapSelected: true },
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
                               ["New York", "12", "gianaris_ny"], ["Illinois", "4", "kimberly_lightford"],
                               ["Pennsylvania", "33", "doug_mastriano"], ["Ohio", "2", "theresa_gavarone"],
                               ["Georgia", "22", "harold_jones_ga"], ["Michigan", "8", "mallory_mcmorrow"], ["North Carolina", "17", "sydney_batch"],
                               ["Virginia", "34", "scott_surovell"], ["Washington", "43", "jamie_pedersen"], ["Arizona", "18", "priya_sundareshan"],
                               ["New Jersey", "29", "teresa_ruiz"], ["Massachusetts", "21", "bruce_tarr"], ["Tennessee", "29", "raumesh_akbari"],
                               ["Colorado", "6", "cleave_simpson"], ["Maryland", "39", "nancy_king"], ["Minnesota", "59", "bobby_joe_champion"],
                               ["Wisconsin", "27", "dianne_hesselbein"], ["Indiana", "40", "shelli_yoder"], ["Missouri", "18", "cindy_olaughlin"],
                               ["Kentucky", "33", "gerald_neal"], ["Alabama", "24", "bobby_singleton"], ["South Carolina", "25", "shane_massey"],
                               ["Nevada", "8", "marilyn_dondero_loop"], ["Oregon", "19", "rob_wagner"],
                               ["Louisiana", "5", "royce_duplessis"], ["New Hampshire", "19", "regina_birdsell"],
                               ["Connecticut", "11", "martin_looney"]]) {
    eq(levelOf(boot(LOC(st, sd)), "statesenate").pid, pid, `${st} SD ${sd} stopped naming its member`);
  }
  // Nebraska still has no State House row.
  eq(levelOf(boot(LOC("Nebraska", "28")), "statehouse"), null, "Nebraska grew a State House row");
  // The two new states changed: before this pass they were unmapped. (Once
  // this pass is committed HEAD maps them too, so the baseline half only runs
  // while HEAD still lacks them.)
  for (const st of ["Alaska"]) {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: "19", stateHouseDistrict: "19", mapSelected: true };
    if (headVhl.indexOf("alaska: 1") < 0)
      eq(levelOf(boot(Object.assign({}, loc), { "voter-hub-location.js": headVhl }), "statesenate").mapped, false, `${st}: HEAD already mapped it`);
    eq(levelOf(boot(Object.assign({}, loc)), "statesenate").mapped, true, `${st}: the State Senate seat is not mapped`);
  }
  const O = boot(LOC("District of Columbia", "17"));
  eq(levelOf(O, "statehouse").mapped, false, "the District of Columbia's legislative seats claim to be mapped");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · every state has legislative lines");
// ═════════════════════════════════════════════════════════════════════════════
{
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
    "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
    "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
    "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 50, "the state list is not fifty");
  const tig = (MAP.match(/var LEG_TIGER_STATES = \{([\s\S]*?)\};/) || [])[1] || "";
  const finderStates = [...tig.matchAll(/'([^']+)': 1/g)].map((m) => m[1]);
  // Utah is drawn from UGRC, not TIGERweb; every other state is on the TIGERweb list.
  eq(JSON.stringify(finderStates.slice().sort()), JSON.stringify(STATES.filter((s) => s !== "Utah")),
    "finder: the TIGERweb legislative list is not every state but Utah");
  for (const st of STATES) eq(RES._pdxLegMapped(st) || st === "Utah", true, `resolver: ${st} is not legislatively mapped`);
  for (const st of STATES.filter((s) => s !== "Utah")) {
    const l = levelOf(boot({ state: st, city: "", county: "", district: "1", stateSenateDistrict: "1", stateHouseDistrict: "1", mapSelected: true }), "statesenate");
    eq(l && l.mapped, true, `${st}: the State Senate row does not read as mapped`);
  }
  // A place that is not a state still reads its legislative rows as unmapped.
  const dc = boot({ state: "District of Columbia", city: "Washington", county: "District of Columbia", district: "1" });
  eq(levelOf(dc, "statesenate").mapped, false, "District of Columbia: a State Senate seat reads as mapped");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no equity language, and the shell moved");
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
  console.error(`\n✗ alaska legislative lines: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ alaska legislative lines: ${passed} passed — the last state's lines, every state now drawn, a member only where the roster claims the seat`);
