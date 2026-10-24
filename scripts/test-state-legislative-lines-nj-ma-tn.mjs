#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-state-legislative-lines-nj-ma-tn.mjs — New Jersey, Massachusetts, Tennessee
// ─────────────────────────────────────────────────────────────────────────────
// The TIGERweb legislative list now also draws New Jersey, Massachusetts and
// Tennessee: the same 2024 layers (5 upper, 6 lower), the same one-state-by-FIPS
// query, loaded only after a geocode has named the state. New Jersey elects
// both chambers from one set of 40 legislative districts (the roster files its
// senators "LD N"). MASSACHUSETTS NAMES ITS DISTRICTS — "First Essex and
// Middlesex", "1st Barnstable" — so the record keeps TIGERweb's sequence as an
// internal key and every chip and card prints the seat's name, never "District
// N"; its senators are matched by their record's district name.
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
//      keyed state legislators on file. An "LD 29" senator is never seated in
//      the Assembly for LD 29.
//   4. THE FOURTEEN STATES ALREADY MAPPED ARE UNCHANGED against HEAD's resolver.
//   6. MASSACHUSETTS IS NAMED, NEVER NUMBERED: on the finder's chips, banner and
//      confirm button, and on every card, the seat is its TIGERweb name.
//   5. NO EQUITY LANGUAGE in anything this pass painted or changed.
//
//   node scripts/test-state-legislative-lines-nj-ma-tn.mjs

import { R, HEAD, MAP, sq, driveFinder, boot, levelOf, band, tigerUrls, layerOf } from "./state-leg-harness.mjs";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ nj/ma/tn legislative lines: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

// Real points, and what TIGERweb's 2024 layers give for them. `sk`/`hk` are the
// record keys; `sChip`/`hChip` are what the finder's chips must read.
const PLACES = [
  { state: "New Jersey", fips: "34", city: "Newark", county: "Essex", lat: 40.7357, lng: -74.1724,
    name: "920 Broad St, Newark, NJ 07102", sd: "029", hd: "029", cd: "10",
    sk: "29", hk: "29", sChip: "District 29", hChip: "District 29" },
  { state: "Massachusetts", fips: "25", city: "Gloucester", county: "Essex", lat: 42.6159, lng: -70.6620,
    name: "9 Dale Ave, Gloucester, MA 01930", sd: "D21", hd: "028", cd: "06",
    sName: "First Essex and Middlesex District", hName: "5th Essex District",
    sk: "21", hk: "28", sChip: "First Essex and Middlesex District", hChip: "5th Essex District" },
  { state: "Tennessee", fips: "47", city: "Nashville", county: "Davidson", lat: 36.1627, lng: -86.7816,
    name: "1 Public Square, Nashville, TN 37201", sd: "021", hd: "051", cd: "07",
    sk: "21", hk: "51", sChip: "District 21", hChip: "District 51" },
];
const box = (p, props) => [sq(p.lng - 0.2, p.lat - 0.2, p.lng + 0.2, p.lat + 0.2, props)];
const tigerFor = (p) => ({
  4: { features: box(p, { CD119: p.cd }), point: { CD119: p.cd } },
  5: { features: box(p, p.sName ? { SLDU: p.sd, NAME: p.sName } : { SLDU: p.sd }), point: { SLDU: p.sd } },
  6: { features: box(p, p.hName ? { SLDL: p.hd, NAME: p.hName } : { SLDL: p.hd }), point: { SLDL: p.hd } },
});
const n = (s) => String(parseInt(s, 10));
// The finder's page carries voter-hub-location.js, which owns the name table;
// the finder harness does not, so it is handed the real one.
const RES = boot({ state: "Tennessee" });
must(typeof RES.pdxLegDistrictName === "function", "the resolver's name table did not load");
const withNames = (F) => { F.win.pdxLegDistrictName = RES.pdxLegDistrictName; F.win.pdxLegDistrictsNamed = RES.pdxLegDistrictsNamed; return F; };

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
  if (p.sName) {
    // Named, never numbered, anywhere the finder speaks.
    const text = [F.els["pdx-map-search-note"].innerHTML, F.els["pdx-map-done"].textContent,
                  F.els["pdx-map-result-use"].textContent, F.els["pdx-map-result-dist-val"].textContent,
                  F.els["pdx-map-result-alt"].innerHTML, F.els["pdx-map-hint"].innerHTML].join(" | ");
    has(text, p.sName, `${p.state}: the finder does not name the State Senate seat`);
    has(F.els["pdx-map-done"].textContent, "State Senate · " + p.sName, `${p.state}: the confirm button does not name the Senate seat`);
    has(F.els["pdx-map-done"].textContent, "State House · " + p.hName, `${p.state}: the confirm button does not name the House seat`);
    ok(!/State (?:Senate|House) (?:District )?\d/.test(text), `${p.state}: the finder printed a legislative seat as a number (${text.slice(0, 300)})`);
    const T5 = tigerUrls(F.wire).filter((u) => layerOf(u) === "5" && u.indexOf("returnGeometry=true") > 0);
    ok(T5.length && T5.every((u) => /outFields=SLDU,NAME/.test(u)), `${p.state}: the Senate layer was not asked for its NAME field`);
  } else {
    lacks(tigerUrls(F.wire).join("\n"), ",NAME", `${p.state}: a numbered state asked for the NAME field`);
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
  has(MAP, "var LEG_NAMED_STATES = { 'Massachusetts': { senate: 1, house: 1 },", "source: Massachusetts is not named in both chambers");
  has(MAP, "var LEG_TIGER_STATES = { 'Texas': 1, 'California': 1, 'Florida': 1, 'New York': 1,\n                             'Illinois': 1, 'Pennsylvania': 1, 'Ohio': 1,\n                             'Georgia': 1, 'Michigan': 1, 'North Carolina': 1,\n                             'Virginia': 1, 'Washington': 1, 'Arizona': 1,\n                             'New Jersey': 1, 'Massachusetts': 1, 'Tennessee': 1,\n                             'Colorado': 1, 'Maryland': 1, 'Minnesota': 1,\n                             'Wisconsin': 1, 'Indiana': 1, 'Missouri': 1,\n                             'Kentucky': 1, 'Alabama': 1, 'South Carolina': 1,\n                             'Iowa': 1, 'Oklahoma': 1, 'Kansas': 1,\n                             'Nevada': 1, 'Nebraska': 1, 'Arkansas': 1,\n                             'Oregon': 1, 'Idaho': 1, 'Montana': 1,\n                             'New Mexico': 1, 'Wyoming': 1,\n                             'Mississippi': 1, 'West Virginia': 1, 'Hawaii': 1 };",
    "source: the finder's TIGERweb legislative list is not exactly these four states");
  has(R("voter-hub-location.js"), "var _PDX_LEG_MAPPED = { texas: 1, california: 1, florida: 1, 'new york': 1,\n                         illinois: 1, pennsylvania: 1, ohio: 1,\n                         georgia: 1, michigan: 1, 'north carolina': 1,\n                         virginia: 1, washington: 1, arizona: 1,\n                         'new jersey': 1, massachusetts: 1, tennessee: 1,\n                         colorado: 1, maryland: 1, minnesota: 1,\n                         wisconsin: 1, indiana: 1, missouri: 1,\n                         kentucky: 1, alabama: 1, 'south carolina': 1,\n                         iowa: 1, oklahoma: 1, kansas: 1,\n                         nevada: 1, nebraska: 1, arkansas: 1,\n                         oregon: 1, idaho: 1, montana: 1,\n                         'new mexico': 1, wyoming: 1,\n                         mississippi: 1, 'west virginia': 1, hawaii: 1 };",
    "source: the resolver's legislative list does not match the finder's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the card names a member only where the roster claims the seat");
// ═════════════════════════════════════════════════════════════════════════════
const at = (p, sd, hd) => ({ state: p.state, city: p.city, county: p.county + " County", district: p.cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const [NJ, MA, TN] = PLACES;
const NAMED = [
  // [place, senate key, lower key, expected senate pid, expected name]
  [NJ, "29", "29", "teresa_ruiz", "Teresa Ruiz"],
  [TN, "27", "51", "jack_johnson_tn", "Jack Johnson"],
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
  // A seat nobody claims: the Nashville address's own SD 21.
  const W = boot(at(TN, "21", "51"));
  eq(levelOf(W, "statesenate").pid, null, "Tennessee SD 21: a member was invented");
  has(band(W), "District 21 — no member on file yet", "Tennessee SD 21: the row does not say nobody is on file");
  // And an LD senator is never the Assembly's member for that number.
  for (const [st, d, pid] of [["New Jersey", 29, "teresa_ruiz"], ["New Jersey", 25, "anthony_bucco"]]) {
    eq(W._pdxStateLegSeat(st, "statesenate", d), pid, `${st} LD ${d}: the senator on file is not named`);
    eq(W._pdxStateLegSeat(st, "statehouse", d), null, `${st} LD ${d}: the senator was seated in the House`);
  }
}
{
  // Every seat in all six chambers.
  const W = boot(at(NJ, "1", "1"));
  const CHAMBERS = [["New Jersey", 40, 40], ["Massachusetts", 40, 160], ["Tennessee", 33, 99]];
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
        if (st === "Massachusetts") {
          // Named: the record's district name is the seat's TIGERweb name.
          const key = (s) => String(s).toLowerCase().replace(/&/g, " and ").replace(/[-,.]/g, " ").split(/\s+/)
            .filter((w) => w && w !== "and" && w !== "district").map((w) => ({ first: "1st", second: "2nd", third: "3rd" }[w] || w)).join(" ");
          eq(key(rec.district), key(W.pdxLegDistrictName(st, ch, d)), `roster: ${pid}'s district name is not ${ch} ${d}'s`);
        } else {
          ok(rec && new RegExp("^(SD|HD|LD)?\\s*" + d + "$").test(String(rec.district || "").trim()), `roster: ${pid}'s record does not name ${ch} ${d}`);
        }
        eq(W.pdxSeatClaim(pid, ch, d) === "mismatch", false, `roster: ${pid} seated in ${st} ${ch} ${d}, which its record contradicts`);
      }
    }
  }
  eq(JSON.stringify([...named].sort()),
    JSON.stringify(["anthony_bucco", "bruce_tarr", "cynthia_creem", "jack_johnson_tn", "randy_mcnally", "raumesh_akbari", "teresa_ruiz"]),
    "roster: the members the lookup can name are not exactly the district-keyed state legislators on file");
  // Leaders whose records name no district, and U.S. House members whose titles
  // say "House", are never placed in a legislative seat.
  for (const p of ["nicholas_scutari", "ron_mariano", "karen_spilka", "cameron_sexton", "kclark", "neal", "pallone"]) {
    ok(!named.has(p), `roster: ${p} was placed in a legislative seat`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · Massachusetts is named on every card, and its senators are matched by name");
// ═════════════════════════════════════════════════════════════════════════════
{
  const MA_LOC = (sk, hk) => ({ state: "Massachusetts", city: MA.city, county: "Essex County", district: "6",
    stateSenateDistrict: sk, stateHouseDistrict: hk, mapSelected: true });
  // Gloucester: First Essex and Middlesex (Bruce Tarr on file), 5th Essex (nobody).
  const W = boot(MA_LOC("21", "28"));
  const reps = W.pdxRepsForMe();
  eq(reps.legislativeMapped, true, "Massachusetts is not legislatively mapped");
  const ss = levelOf(W, "statesenate"), sh = levelOf(W, "statehouse");
  eq(ss.pid, "bruce_tarr", "Massachusetts: Bruce Tarr is not named for First Essex and Middlesex");
  eq(ss.districtName, "First Essex and Middlesex District", "Massachusetts: the Senate level does not carry its name");
  eq(ss.distLabel, "State Senate · First Essex and Middlesex District", "Massachusetts: the Senate row's heading is not the seat's name");
  eq(sh.pid, null, "Massachusetts: a House member was invented for 5th Essex");
  eq(sh.distLabel, "State House · 5th Essex District", "Massachusetts: the House row's heading is not the seat's name");
  const out = band(W), vis = out.replace(/<[^>]+>/g, " ");
  has(out, "Bruce Tarr", "Massachusetts: the senator on file is not on the card");
  has(out, "5th Essex District — no member on file yet", "Massachusetts: the unclaimed House seat does not say so by name");
  // The U.S. House row is numbered and stays so; the two legislative keys (21,
  // 28) are never printed, and no legislative heading is numbered.
  for (const k of ["District 21", "District 28"]) lacks(vis, k, "Massachusetts: the card printed a legislative key as a number");
  ok(!/State (?:Senate|House) · District \d/.test(vis), "Massachusetts: a legislative heading is numbered");
  // The share card is the same strings.
  const card = W.PDXWhoRepresentsMe.card && W.PDXWhoRepresentsMe.card();
  if (card) ok(!/State (?:Senate|House) · District \d/.test(card.text), "Massachusetts: the share card printed a numbered legislative seat");
  // Newton: Norfolk and Middlesex — Cynthia Creem — and not Middlesex and Norfolk.
  const N = boot(MA_LOC("17", "69"));
  eq(levelOf(N, "statesenate").pid, "cynthia_creem", "Massachusetts: Cynthia Creem is not named for Norfolk and Middlesex");
  eq(boot(MA_LOC("13", "69")).pdxRepsForMe().levels.find((l) => l.key === "statesenate").pid, null,
    "Massachusetts: Middlesex and Norfolk (a different seat) named Creem — word order was ignored");
  // The seat field's scope line says the name too.
  const sf = N.pdxSeatField("statesenate");
  eq(sf.scope, "Massachusetts · Norfolk and Middlesex District", "Massachusetts: the seat field's scope line is not the seat's name");
  // Every key in the table is a named seat; a key past the table is no seat at all.
  for (const [ch, nmax] of [["statesenate", 40], ["statehouse", 160]]) {
    for (let d = 1; d <= nmax; d++) ok(!!W.pdxLegDistrictName("Massachusetts", ch, d), `Massachusetts ${ch} ${d}: no name`);
    eq(W.pdxLegDistrictName("Massachusetts", ch, nmax + 1), "", `Massachusetts ${ch}: a key past the table has a name`);
  }
  const X = boot(MA_LOC("41", "161"));
  eq(levelOf(X, "statesenate").district, null, "Massachusetts: an unnamed key was published as a district");
  lacks(band(X), "District 41", "Massachusetts: an unnamed key was printed as a number");
  eq(W.pdxLegDistrictText("Tennessee", "statesenate", "21"), "District 21", "numbered states still read District N");
  eq(W.pdxLegDistrictText("Massachusetts", "statesenate", "21"), "First Essex and Middlesex District", "pdxLegDistrictText does not name a Massachusetts seat");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the fourteen states already mapped are identical to HEAD's");
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
    { state: "Louisiana", city: "Baton Rouge", county: "East Baton Rouge Parish", district: "2", stateSenateDistrict: "17", stateHouseDistrict: "33" },
  ];
  must(headVhl, "no git baseline for voter-hub-location.js");
  const pick = (r) => JSON.stringify([r.legislativeMapped, r.districtsResolvable, r.levels.map((l) => [l.key, l.district, l.pid, l.mapped])]);
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
                               ["Virginia", "34", "scott_surovell"], ["Washington", "43", "jamie_pedersen"], ["Arizona", "18", "priya_sundareshan"]]) {
    eq(levelOf(boot(LOC(st, sd)), "statesenate").pid, pid, `${st} SD ${sd} stopped naming its member`);
  }
  const O = boot(LOC("Louisiana", "17"));
  eq(levelOf(O, "statehouse").mapped, false, "Louisiana's legislative seats claim to be mapped");
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
  console.error(`\n✗ nj/ma/tn legislative lines: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ nj/ma/tn legislative lines: ${passed} passed — three more states' lines, one state at a time, a member only where the roster claims the seat`);
