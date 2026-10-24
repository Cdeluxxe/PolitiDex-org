#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislative-lines-co-md-mn.mjs — Colorado, Maryland, Minnesota
// ─────────────────────────────────────────────────────────────────────────────
// The TIGERweb legislative list now also draws Colorado, Maryland and
// Minnesota: the same 2024 layers (5 upper, 6 lower), the same one-state-by-
// FIPS query, loaded only after a geocode has named the state. MARYLAND'S
// HOUSE OF DELEGATES ("3", "47A") AND MINNESOTA'S HOUSE ("1A", "1B") ARE
// LETTERED: the record keeps a plain key and every chip and card prints the
// seat's real label, and 1A and 1B are never one seat. Colorado and both
// Senates are numbered.
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
//   4. THE SEVENTEEN STATES ALREADY MAPPED ARE UNCHANGED against HEAD's resolver.
//   6. LETTERED SEATS ARE DISTINCT AND LABELLED: every code has its own key,
//      the finder never truncates "59B" to 59, and a card says "District 59B".
//   5. NO EQUITY LANGUAGE in anything this pass painted or changed.
//
//   node scripts/test-state-legislative-lines-co-md-mn.mjs

import { R, HEAD, MAP, sq, driveFinder, boot, levelOf, band, tigerUrls, layerOf } from "./state-leg-harness.mjs";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ co/md/mn legislative lines: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

// The finder's page carries voter-hub-location.js, which owns the lettered
// tables; the finder harness does not, so it is handed the real ones.
const RES = boot({ state: "Colorado" });
must(typeof RES.pdxLegDistrictKey === "function", "the resolver's lettered tables did not load");
const withNames = (F) => {
  for (const k of ["pdxLegDistrictName", "pdxLegDistrictsNamed", "pdxLegChamberNamed", "pdxLegDistrictKey"]) F.win[k] = RES[k];
  return F;
};
const KEY = (st, ch, code) => String(RES.pdxLegDistrictKey(st, ch, code));
// Real points, and what TIGERweb's 2024 layers give for them. `sk`/`hk` are the
// record keys; `sChip`/`hChip` are what the finder's chips must read.
const PLACES = [
  { state: "Colorado", fips: "08", city: "Denver", county: "Denver", lat: 39.7392, lng: -104.9903,
    name: "1437 Bannock St, Denver, CO 80202", sd: "031", hd: "005", cd: "01", sChip: "District 31", hChip: "District 5" },
  { state: "Maryland", fips: "24", city: "Annapolis", county: "Anne Arundel", lat: 38.9784, lng: -76.4922,
    name: "100 State Cir, Annapolis, MD 21401", sd: "030", hd: "30A", cd: "03", sChip: "District 30", hChip: "District 30A" },
  { state: "Minnesota", fips: "27", city: "Minneapolis", county: "Hennepin", lat: 44.9778, lng: -93.2650,
    name: "350 S 5th St, Minneapolis, MN 55415", sd: "059", hd: "59B", cd: "05", sChip: "District 59", hChip: "District 59B" },
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
  has(MAP, "var LEG_TIGER_STATES = { 'Texas': 1, 'California': 1, 'Florida': 1, 'New York': 1,\n                             'Illinois': 1, 'Pennsylvania': 1, 'Ohio': 1,\n                             'Georgia': 1, 'Michigan': 1, 'North Carolina': 1,\n                             'Virginia': 1, 'Washington': 1, 'Arizona': 1,\n                             'New Jersey': 1, 'Massachusetts': 1, 'Tennessee': 1,\n                             'Colorado': 1, 'Maryland': 1, 'Minnesota': 1,\n                             'Wisconsin': 1, 'Indiana': 1, 'Missouri': 1,\n                             'Kentucky': 1, 'Alabama': 1, 'South Carolina': 1,\n                             'Iowa': 1, 'Oklahoma': 1, 'Kansas': 1,\n                             'Nevada': 1, 'Nebraska': 1, 'Arkansas': 1,\n                             'Oregon': 1, 'Idaho': 1, 'Montana': 1,\n                             'New Mexico': 1, 'Wyoming': 1,\n                             'Mississippi': 1, 'West Virginia': 1, 'Hawaii': 1,\n                             'Louisiana': 1, 'Maine': 1, 'New Hampshire': 1,\n                             'Connecticut': 1, 'Rhode Island': 1, 'Vermont': 1 };",
    "source: the finder's TIGERweb legislative list is not exactly these four states");
  has(R("voter-hub-location.js"), "var _PDX_LEG_MAPPED = { texas: 1, california: 1, florida: 1, 'new york': 1,\n                         illinois: 1, pennsylvania: 1, ohio: 1,\n                         georgia: 1, michigan: 1, 'north carolina': 1,\n                         virginia: 1, washington: 1, arizona: 1,\n                         'new jersey': 1, massachusetts: 1, tennessee: 1,\n                         colorado: 1, maryland: 1, minnesota: 1,\n                         wisconsin: 1, indiana: 1, missouri: 1,\n                         kentucky: 1, alabama: 1, 'south carolina': 1,\n                         iowa: 1, oklahoma: 1, kansas: 1,\n                         nevada: 1, nebraska: 1, arkansas: 1,\n                         oregon: 1, idaho: 1, montana: 1,\n                         'new mexico': 1, wyoming: 1,\n                         mississippi: 1, 'west virginia': 1, hawaii: 1,\n                         louisiana: 1, maine: 1, 'new hampshire': 1,\n                         connecticut: 1, 'rhode island': 1, vermont: 1 };",
    "source: the resolver's legislative list does not match the finder's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the card names a member only where the roster claims the seat");
// ═════════════════════════════════════════════════════════════════════════════
const at = (p, sd, hd) => ({ state: p.state, city: p.city, county: p.county + " County", district: p.cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const [CO, MD, MN] = PLACES;
const NAMED = [
  // [place, senate key, lower key, expected senate pid, expected name, lower label]
  [CO, "32", "5", "robert_rodriguez_co", null, "District 5"],
  [MD, "39", MD.hk, "nancy_king", "Nancy King", "District 30A"],
  [MN, "59", MN.hk, "bobby_joe_champion", "Bobby Joe Champion", "District 59B"],
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
  has(out, W.CMP_DATA[pid].name, `${p.state}: the State Senate member is not on the card`);
  if (nm) eq(W.CMP_DATA[pid].name, nm, `${p.state}: fixture name drifted`);
  has(out, `${hl} — no member on file yet`, `${p.state}: the unclaimed lower-chamber seat does not say nobody is on file`);
  eq(sh.distLabel, "State House · " + hl, `${p.state}: the lower-chamber heading is not the seat's label`);
  lacks(out, "only maps state legislative districts in", `${p.state}: the reader is told their lines are not drawn`);
  ok(!EQUITY.test(out.replace(/<[^>]+>/g, " ")), `${p.state}: the card carries equity language`);
}
{
  // A seat nobody claims: the Denver address's own SD 31.
  const W = boot(at(CO, "31", "5"));
  eq(levelOf(W, "statesenate").pid, null, "Colorado SD 31: a member was invented");
  has(band(W), "District 31 — no member on file yet", "Colorado SD 31: the row does not say nobody is on file");
}
{
  // Every seat in all six chambers.
  const W = boot(at(CO, "1", "1"));
  const CHAMBERS = [["Colorado", 35, 65], ["Maryland", 47, 71], ["Minnesota", 67, 134]];
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
    JSON.stringify(["bobby_joe_champion", "cleave_simpson", "mark_johnson_mn", "nancy_king", "robert_rodriguez_co", "steve_hershey"]),
    "roster: the members the lookup can name are not exactly the district-keyed state legislators on file");
  // Leaders whose records name no district, and U.S. House members whose titles
  // say "House", are never placed in a legislative seat.
  for (const p of ["james_coleman", "julie_mccluskie", "bill_ferguson", "erin_murphy", "lisa_demuth", "emmer", "raskin", "andy_harris", "neguse", "angie_craig"]) {
    ok(!named.has(p), `roster: ${p} was placed in a legislative seat`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · lettered seats are distinct, labelled, and never truncated");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const [st, codes] of [["Maryland", ["003", "01A", "01B", "01C", "30A", "30B", "046", "47A", "47B"]],
                             ["Minnesota", ["01A", "01B", "59A", "59B", "67A", "67B"]]]) {
    const keys = codes.map((c) => RES.pdxLegDistrictKey(st, "statehouse", c));
    keys.forEach((k, i) => ok(k > 0, `${st} ${codes[i]}: no key`));
    eq(new Set(keys).size, keys.length, `${st}: two lettered seats share one key`);
    codes.forEach((c, i) => eq(RES.pdxLegDistrictName(st, "statehouse", keys[i]), "District " + c.replace(/^0+/, ""), `${st} ${c}: its label is not its own`));
    eq(RES.pdxLegDistrictKey(st, "statehouse", "99Z"), 0, `${st}: a code not on the map got a key`);
    // The Senate is numbered and stays so.
    eq(RES.pdxLegDistrictKey(st, "statesenate", "021"), 21, `${st}: the Senate is no longer read by number`);
    eq(RES.pdxLegChamberNamed(st, "statesenate"), false, `${st}: the Senate is treated as lettered`);
    eq(RES.pdxLegChamberNamed(st, "statehouse"), true, `${st}: the House is not treated as lettered`);
  }
  // Every key in both lettered tables has a label of its own.
  for (const [st, nmax] of [["Maryland", 71], ["Minnesota", 134]]) {
    const seen = new Set();
    for (let k = 1; k <= nmax; k++) {
      const l = RES.pdxLegDistrictName(st, "statehouse", k);
      ok(/^District \d+[A-C]?$/.test(l), `${st} key ${k}: label "${l}"`);
      seen.add(l);
    }
    eq(seen.size, nmax, `${st}: two keys share a label`);
    eq(RES.pdxLegDistrictName(st, "statehouse", nmax + 1), "", `${st}: a key past the table has a label`);
  }
  // The finder: 59A and 59B, side by side, resolve to two different seats.
  const chips = [];
  for (const hd of ["59A", "59B"]) {
    const p = Object.assign({}, MN, { hd });
    const F = withNames(await driveFinder({ state: p.state, hit: { lat: p.lat, lng: p.lng, name: p.name, city: p.city, county: p.county, state: p.state }, tiger: tigerFor(p) }));
    await F.search(p.name);
    chips.push([F.chip("house"), F.win._currentVoterLocation.stateHouseDistrict]);
  }
  eq(chips[0][0], "District 59A", "finder: 59A is not labelled 59A");
  eq(chips[1][0], "District 59B", "finder: 59B is not labelled 59B");
  ok(chips[0][1] !== chips[1][1], `finder: 59A and 59B saved the same key (${chips[0][1]})`);
  // Without the lookup on the page, a lettered polygon is no seat — never its number.
  {
    const F = await driveFinder({ state: MN.state, hit: { lat: MN.lat, lng: MN.lng, name: MN.name, city: MN.city, county: MN.county, state: MN.state }, tiger: tigerFor(MN) });
    await F.search(MN.name);
    eq(F.chip("house"), "Not set", "finder: with no lookup, 59B was read as a number");
  }
  // A card never prints a lettered seat's key as its number.
  const W = boot(at(MD, "30", MD.hk));
  const vis = band(W).replace(/<[^>]+>/g, " ");
  has(vis, "District 30A", "Maryland: the card does not say District 30A");
  if (MD.hk !== "30") lacks(vis, "District " + MD.hk + " ", "Maryland: the card printed the lettered seat's key");
  eq(W.pdxSeatField("statehouse").scope, "Maryland · District 30A", "Maryland: the seat field's scope line is not the seat's label");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the seventeen states already mapped are identical to HEAD's");
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
    { state: "Delaware", city: "Dover", county: "Kent County", district: "1", stateSenateDistrict: "17", stateHouseDistrict: "33" },
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
                               ["New Jersey", "29", "teresa_ruiz"], ["Massachusetts", "21", "bruce_tarr"], ["Tennessee", "29", "raumesh_akbari"]]) {
    eq(levelOf(boot(LOC(st, sd)), "statesenate").pid, pid, `${st} SD ${sd} stopped naming its member`);
  }
  const O = boot(LOC("Delaware", "17"));
  eq(levelOf(O, "statehouse").mapped, false, "Delaware's legislative seats claim to be mapped");
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
  console.error(`\n✗ co/md/mn legislative lines: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ co/md/mn legislative lines: ${passed} passed — three more states' lines, one state at a time, a member only where the roster claims the seat`);
