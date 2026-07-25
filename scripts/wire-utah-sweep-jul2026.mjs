#!/usr/bin/env node
/**
 * wire-utah-sweep-jul2026.mjs — fifth July 2026 Utah identity pass.
 *
 * Two jobs, both pure identity wiring (no new stances, scores or narrative):
 *
 *  1. SWEEP. The four previous passes each found House seats that were uncovered
 *     only because the sitting member had curated stance content but no
 *     cmp-data.js roster record — the exact condition that keeps a person out of
 *     BOTH Utah House tables, since 10e/10g have no office or district to check
 *     without a record. This pass swept all 75 House and all 29 Senate seats
 *     against _UTAH_HOUSE_INFO / _UTAH_SENATE_INFO and the two KR_STATE_*
 *     incumbent tables and found eleven more House members in that state, plus
 *     two already-rostered members (Schultz, Romero) who had never been put in
 *     the info map at all.
 *
 *  2. SENATE CATCH-UP. Districts 4, 11, 14, 15 and 22 were the last five seats
 *     absent from both Senate tables. All five sitting senators are confirmed
 *     against the public record and four of the five were already
 *     content-bearing here, so all five are now wired and the Senate is
 *     complete at 29 of 29.
 *
 * Deliberately NOT done here, and reported instead:
 *   • The ~20 "surface split" pairs where a full-name stance id
 *     (`evan_vickers`) and a roster id (`evickers`) are the same person. Those
 *     people are already wired under the roster id, so no district is uncovered;
 *     wiring the twin would create exactly the parallel identity the constraints
 *     forbid. That is merge debt, not map debt.
 *   • Anyone not currently sitting: 2026 candidates, resigned members, county
 *     officials and the Lt. Governor all stayed out.
 *
 * Idempotent. Dry-run by default; pass --apply to write.
 *
 *   node scripts/wire-utah-sweep-jul2026.mjs
 *   node scripts/wire-utah-sweep-jul2026.mjs --apply
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

const files = new Map();
const read = (rel) => {
  if (!files.has(rel)) files.set(rel, readFileSync(join(ROOT, rel), "utf8"));
  return files.get(rel);
};

let applied = 0, alreadyDone = 0, failed = 0;

/**
 * Replace `from` with `to` exactly once. Already-applied edits are no-ops.
 *
 * The already-applied test has to be `to` alone, NOT "`to` present and `from`
 * absent": half these edits are insertions written as sub(file, anchor,
 * anchor + added), so the anchor is still there afterwards and the stricter
 * test would happily insert the same block a second time.
 */
function sub(rel, from, to, label) {
  const src = read(rel);
  if (src.includes(to)) {
    alreadyDone++;
    console.log(`  ·  ${label} — already applied`);
    return;
  }
  const n = src.split(from).length - 1;
  if (n !== 1) {
    failed++;
    console.log(`  ✗  ${label} — anchor found ${n} times, expected 1`);
    return;
  }
  files.set(rel, src.replace(from, to));
  applied++;
  console.log(`  +  ${label}`);
}

// ── 1. cmp-data.js: fourteen minimal roster records ─────────────────────────
// Same shape as the Bishop / Miller / Larson / Pace records this pass follows:
// `score` null with kept/broken/pending 0 because no promise-tracking pass has
// been run for them (a number here would be invented), `issues` lifted verbatim
// from each id's own existing stance-card topics, `termStart` the start of the
// CURRENT seat, and no `termEnd` — every one of them is sitting. 10g/10d reject
// a /former/ office or any termEnd on a pid in the info maps, which is what
// keeps this table honest about who holds a seat today.

const HOUSE_RECORDS = `
 // FIFTH July 2026 pass — the sweep. Eleven more House members who were
 // content-bearing here (a curated stance block, sometimes a Spotlight card) but
 // roster-less, so neither Utah House table could name them. Districts confirmed
 // against the public record first; each is post-2023 numbering.
 "verona_mauga": {
  "name": "Verona Mauga", "office": "Utah State Representative",
  "state": "UT District 31 (West Valley City / Taylorsville, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Disability & Social Services", "Small Business", "Public Schools", "Bike-Lane Safety", "Protecting Veterans"]
 },
 "doug_owens": {
  "name": "Doug Owens", "office": "Utah State Representative",
  "state": "UT District 33 (Millcreek, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021-01",
  "issues": ["Great Salt Lake & Water Conservation", "Clean Air", "Wetlands & Habitat", "Child Influencer Protections"]
 },
 // Announced in Dec 2025 that she will not seek re-election, but she is the
 // sitting member through the end of her term in January 2027 and therefore gets
 // NO \`termEnd\` — 10g rejects one on a pid the info map wires to a live seat, and
 // rightly: a retirement announcement is not a vacancy.
 "carol_spackman_moss": {
  "name": "Carol Spackman Moss", "office": "Utah State Representative",
  "state": "UT District 34 (Holladay, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2001-01",
  "issues": ["Public Schools", "Air Quality", "Gun Safety", "Opioid & Overdose Response", "Affordable Housing"]
 },
 "john_arthur": {
  "name": "John Arthur", "office": "Utah State Representative",
  "state": "UT District 41 (Cottonwood Heights, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-12",
  "issues": ["Great Salt Lake & Water", "Teacher Pay & Support", "Public-Employee Bargaining", "Renter Protections", "Transit & Livability"]
 },
 "calvin_roberts": {
  "name": "Calvin Roberts", "office": "Utah State Representative",
  "state": "UT District 46 (Draper / Bluffdale, Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Roads & Infrastructure", "Economic Development", "Small Business", "Fuel-Tax Relief", "Transit Procurement"]
 },
 "candice_pierucci": {
  "name": "Candice Pierucci", "office": "Utah State Representative",
  "state": "UT District 49 (Herriman / Riverton, Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2019-11",
  "issues": ["School Choice", "Online Child Safety", "Taxes & Limited Government", "Maternal & Infant Health"]
 },
 "leah_hansen": {
  "name": "Leah Hansen", "office": "Utah State Representative",
  "state": "UT District 51 (Saratoga Springs / west Lehi, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-08",
  "issues": ["Limiting DEI Programs", "Religious Liberty", "Property-Tax Transparency", "Taxpayer Oversight", "Foreign Land Ownership"]
 },
 "kay_christofferson": {
  "name": "Kay Christofferson", "office": "Utah State Representative",
  "state": "UT District 53 (Lehi, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2013-01",
  "issues": ["Roads & Infrastructure", "Public Transit", "Growth & Mobility Planning", "Corridor Preservation & Property", "Road Usage Charge"]
 },
 "doug_welton": {
  "name": "Doug Welton", "office": "Utah State Representative",
  "state": "UT District 65 (Payson, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021-01",
  "issues": ["Civics Education", "Phone-Free Classrooms", "Property Taxes", "Volunteer EMS Support", "Education Innovation"]
 },
 // The five Senate seats that had been left honestly empty because no roster
 // record existed to name them. Four were content-bearing under these ids
 // already; \`cmusselman\` had a Power-Map row and a browse entry. With these the
 // Senate reaches 29 of 29 and KR_STATE_SENATE_INCUMBENTS has no absent key left.
 "cmusselman": {
  "name": "Calvin Musselman", "office": "Utah State Senator",
  "state": "UT District 4 (West Haven, Weber County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Child Online Safety", "Border Security", "Economic Development", "Human Trafficking Laws", "Penalties for Repeat Crime"]
 },
 // \`party\` is "F" — Forward Party. Not a typo and not a placeholder: index.html
 // renders 'F' / 'Forward' as "Forward Party", and she is the only member of
 // either chamber who is not R or D. Appointed Dec 12, 2025 and seated Dec 17 to
 // fill the vacancy left when Daniel Thatcher resigned; Thatcher is a former
 // member here and holds nothing.
 "emily_buss": {
  "name": "Emily Buss", "office": "Utah State Senator",
  "state": "UT District 11 (Eagle Mountain / Tooele, Utah County)",
  "party": "F", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-12",
  "issues": ["Public Schools", "Government Transparency", "Roads & Transportation Funding", "Local Control of Growth", "Open, Nonpartisan Elections"]
 },
 // She served Utah House District 40 before winning this Senate seat in 2022, so
 // her Spotlight cards have to be read carefully: the one that still called her a
 // Representative was corrected to match its already-correct sibling rather than
 // being left to fail 6's chamber check the moment this record appeared.
 "stephanie_pitcher": {
  "name": "Stephanie Pitcher", "office": "Utah State Senator",
  "state": "UT District 14 (Salt Lake City / Millcreek, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Criminal Justice Reform", "Bail & Pretrial Reform", "Mental Health & Courts", "AI in Law Enforcement", "Juvenile Justice"]
 },
 // Senate Minority Whip. Elected in 2018 to the pre-redistricting District 8; the
 // same territory is District 15 under post-2023 numbering, which is the number
 // this map keys on.
 "kathleen_riebe": {
  "name": "Kathleen Riebe", "office": "Utah State Senator",
  "state": "UT District 15 (Cottonwood Heights, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2019-01",
  "issues": ["Public Schools", "Healthcare Access", "Clean Air & Great Salt Lake", "Workers & Labor Rights", "Student & Youth Health"]
 },
 "heidi_balderree": {
  "name": "Heidi Balderree", "office": "Utah State Senator",
  "state": "UT District 22 (Saratoga Springs / Bluffdale, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-10",
  "issues": ["Veterans & Military", "Property Rights", "Property Taxes", "Charter & Public Education", "Citizen Referenda on Local Bonds"]
 }
});
`;

console.log("cmp-data.js — new roster records");
sub("cmp-data.js",
  `  "issues": ["Housing for Families", "Cut Government Waste", "Responsible Tax Cuts", "Water Conservation"]
 }
});
`,
  `  "issues": ["Housing for Families", "Cut Government Waste", "Responsible Tax Cuts", "Water Conservation"]
 },${HOUSE_RECORDS}`,
  "14 minimal roster records appended (9 House, 5 Senate)");

// Two members were already rostered but had never been put in _UTAH_HOUSE_INFO.
// Adding them there puts 10h in front of their own district strings for the first
// time, and both strings were wrong or absent:
//   • Romero's said District 26. She has held District 25 (west Salt Lake City)
//     since the 2023 renumbering; 26 is a Davis County seat. Without this edit
//     10h fails outright.
//   • Schultz's named no district at all ("Utah · Weber County"), so 10h would
//     have skipped him silently. District 12 (Hooper) is his seat.
console.log("\ncmp-data.js — district labels on two already-rostered members");
sub("cmp-data.js",
  `  "state": "UT District 26 (West SLC)",`,
  `  "state": "UT District 25 (West Salt Lake City, Salt Lake County)",`,
  "aromero District 26 → 25 (post-2023 renumbering)");
sub("cmp-data.js",
  `  "state": "Utah · Weber County",`,
  `  "state": "UT District 12 (Hooper, Weber County)",`,
  "mschultz district named so 10h can check it");

// ── 2. index.html: county fallbacks ─────────────────────────────────────────
// 10f requires _UTAH_*_INFO[pid].c === _UTAH_*_COUNTY[d]. Both fallback tables
// were built on pre-2023 numbering, and every district being wired for the first
// time here has to be re-verified against the member's actual seat of residence.
console.log("\nindex.html — _UTAH_HOUSE_COUNTY (three stale pre-2023 values)");
sub("index.html",
  `      21:'Salt Lake County', 22:'Salt Lake County', 23:'Salt Lake County', 24:'Salt Lake County', 25:'Davis County',`,
  `      21:'Salt Lake County', 22:'Salt Lake County', 23:'Salt Lake County', 24:'Salt Lake County', 25:'Salt Lake County',`,
  "House 25 Davis → Salt Lake (Romero's west SLC seat)");
sub("index.html",
  `      51:'Salt Lake County', 52:'Utah County', 53:'Tooele County', 54:'Salt Lake County', 55:'Salt Lake County',`,
  `      51:'Utah County', 52:'Utah County', 53:'Utah County', 54:'Salt Lake County', 55:'Salt Lake County',`,
  "House 51 Salt Lake → Utah, 53 Tooele → Utah (Saratoga Springs, Lehi)");

console.log("\nindex.html — _UTAH_SENATE_COUNTY (four stale pre-2023 values)");
sub("index.html",
  `      1:'Box Elder County', 2:'Cache County', 3:'Weber County', 4:'Davis County', 5:'Weber County',`,
  `      1:'Box Elder County', 2:'Cache County', 3:'Weber County', 4:'Weber County', 5:'Weber County',`,
  "Senate 4 Davis → Weber (Musselman, West Haven)");
sub("index.html",
  `      11:'Salt Lake County', 12:'Salt Lake County', 13:'Salt Lake County', 14:'Salt Lake County', 15:'Utah County',`,
  `      11:'Utah County', 12:'Salt Lake County', 13:'Salt Lake County', 14:'Salt Lake County', 15:'Salt Lake County',`,
  "Senate 11 Salt Lake → Utah (Buss), 15 Utah → Salt Lake (Riebe)");
sub("index.html",
  `      21:'Utah County', 22:'Davis County', 23:'Utah County', 24:'Utah County', 25:'Utah County',`,
  `      21:'Utah County', 22:'Utah County', 23:'Utah County', 24:'Utah County', 25:'Utah County',`,
  "Senate 22 Davis → Utah (Balderree, Saratoga Springs)");

// ── 3. index.html: the two info maps ────────────────────────────────────────
console.log("\nindex.html — _UTAH_HOUSE_INFO (+11, district order)");
const houseInfo = [
  [`      hall_h11:                { d: 11, c: 'Weber County' },\n`,
   `      mschultz:                { d: 12, c: 'Weber County' },\n`, "mschultz d12"],
  [`      grant_miller:            { d: 24, c: 'Salt Lake County' },\n`,
   `      aromero:                 { d: 25, c: 'Salt Lake County' },\n`, "aromero d25"],
  [`      fitisemanu_h30:          { d: 30, c: 'Salt Lake County' },\n`,
   `      verona_mauga:            { d: 31, c: 'Salt Lake County' },\n` +
   `      doug_owens:              { d: 33, c: 'Salt Lake County' },\n` +
   `      carol_spackman_moss:     { d: 34, c: 'Salt Lake County' },\n`, "verona_mauga d31, doug_owens d33, carol_spackman_moss d34"],
  [`      ivory_h39:               { d: 39, c: 'Salt Lake County' },\n`,
   `      john_arthur:             { d: 41, c: 'Salt Lake County' },\n`, "john_arthur d41"],
  [`      tracy_miller:            { d: 45, c: 'Salt Lake County' },\n`,
   `      calvin_roberts:          { d: 46, c: 'Salt Lake County' },\n` +
   `      candice_pierucci:        { d: 49, c: 'Salt Lake County' },\n`, "calvin_roberts d46, candice_pierucci d49"],
  [`      gricius_h50:             { d: 50, c: 'Utah County' },\n`,
   `      leah_hansen:             { d: 51, c: 'Utah County' },\n`, "leah_hansen d51"],
  [`      cory_maloy_h52:          { d: 52, c: 'Utah County' },\n`,
   `      kay_christofferson:      { d: 53, c: 'Utah County' },\n`, "kay_christofferson d53"],
  [`      jackie_larson:           { d: 64, c: 'Utah County' },\n`,
   `      doug_welton:             { d: 65, c: 'Utah County' },\n`, "doug_welton d65"],
];
for (const [anchor, added, label] of houseInfo)
  sub("index.html", anchor, anchor + added, label);

console.log("\nindex.html — _UTAH_SENATE_INFO (+5, closing the last open seats)");
const senateInfo = [
  [`      john_johnson:    { d: 3,  c: 'Weber County' },\n`,
   `      cmusselman:      { d: 4,  c: 'Weber County' },\n`, "cmusselman d4"],
  [`      lescamilla:      { d: 10, c: 'Salt Lake County' },\n`,
   `      emily_buss:      { d: 11, c: 'Utah County' },\n`, "emily_buss d11"],
  [`      blouin_s13:      { d: 13, c: 'Salt Lake County' },\n`,
   `      stephanie_pitcher:{ d: 14, c: 'Salt Lake County' },\n` +
   `      kathleen_riebe:  { d: 15, c: 'Salt Lake County' },\n`, "stephanie_pitcher d14, kathleen_riebe d15"],
  [`      brammer_s21:     { d: 21, c: 'Utah County' },\n`,
   `      heidi_balderree: { d: 22, c: 'Utah County' },\n`, "heidi_balderree d22"],
];
for (const [anchor, added, label] of senateInfo)
  sub("index.html", anchor, anchor + added, label);

// ── 4. index.html: the two incumbent tables ─────────────────────────────────
// Both bodies are re-emitted in full at five entries per line rather than spliced
// into the existing irregular grouping — inserting eleven keys inline pushed
// several lines past 190 characters. The output is deterministic, so a second run
// is a no-op.
console.log("\nindex.html — KR_STATE_HOUSE_INCUMBENTS (40 → 51 seats)");
sub("index.html",
  `      4:'auxier_h4', 5:'snider_h5', 6:'rob_bishop', 9:'jake_sawyer',
      10:'koford_h10', 11:'hall_h11', 14:'lisonbee_h14', 15:'defay_h15', 16:'tlee', 19:'rward',
      21:'hollins_h24', 22:'jennifer_dailey_provost', 23:'hoang_nguyen', 24:'grant_miller', 28:'nicholeen_p_peck',
      29:'bolinder_h68', 30:'fitisemanu_h30', 36:'james_dunnigan', 37:'ashlee_matthews', 39:'ivory_h39',
      42:'clinton_okerlund', 43:'eliason_h45', 44:'teuscher_h44', 45:'tracy_miller',
      50:'gricius_h50', 52:'cory_maloy_h52', 56:'valpeterson_h56', 59:'kohler_h59',
      60:'grant_pace', 61:'lisa_shepherd', 63:'whyte_h63', 64:'jackie_larson',
      66:'shelley_h66', 67:'christine_watkins', 68:'chew_h68', 69:'logan_monson',
      70:'carl_albrecht', 71:'rshipp', 73:'colin_w_jack', 75:'walt_brooks'`,
  `      4:'auxier_h4', 5:'snider_h5', 6:'rob_bishop', 9:'jake_sawyer', 10:'koford_h10',
      11:'hall_h11', 12:'mschultz', 14:'lisonbee_h14', 15:'defay_h15', 16:'tlee',
      19:'rward', 21:'hollins_h24', 22:'jennifer_dailey_provost', 23:'hoang_nguyen', 24:'grant_miller',
      25:'aromero', 28:'nicholeen_p_peck', 29:'bolinder_h68', 30:'fitisemanu_h30', 31:'verona_mauga',
      33:'doug_owens', 34:'carol_spackman_moss', 36:'james_dunnigan', 37:'ashlee_matthews', 39:'ivory_h39',
      41:'john_arthur', 42:'clinton_okerlund', 43:'eliason_h45', 44:'teuscher_h44', 45:'tracy_miller',
      46:'calvin_roberts', 49:'candice_pierucci', 50:'gricius_h50', 51:'leah_hansen', 52:'cory_maloy_h52',
      53:'kay_christofferson', 56:'valpeterson_h56', 59:'kohler_h59', 60:'grant_pace', 61:'lisa_shepherd',
      63:'whyte_h63', 64:'jackie_larson', 65:'doug_welton', 66:'shelley_h66', 67:'christine_watkins',
      68:'chew_h68', 69:'logan_monson', 70:'carl_albrecht', 71:'rshipp', 73:'colin_w_jack',
      75:'walt_brooks'`,
  "11 seats added, body re-emitted in district order");

console.log("\nindex.html — KR_STATE_SENATE_INCUMBENTS (24 → 29 seats, complete)");
sub("index.html",
  `      1:'ssandall', 2:'cwilson', 3:'john_johnson', 5:'amillner', 6:'jstevenson',
      7:'sadams', 8:'tweiler', 9:'jennifer_plumb', 10:'lescamilla', 12:'kwan_s12', 13:'blouin_s13', 16:'harper_s16',
      17:'lincoln_fillmore', 18:'mccay_s11', 19:'kcullimore', 20:'rwinterton', 21:'brammer_s21',
      23:'kgrover', 24:'kstratton', 25:'mckell_s25', 26:'dhinkins', 27:'dowens_st', 28:'evickers', 29:'dipson'`,
  `      1:'ssandall', 2:'cwilson', 3:'john_johnson', 4:'cmusselman', 5:'amillner',
      6:'jstevenson', 7:'sadams', 8:'tweiler', 9:'jennifer_plumb', 10:'lescamilla',
      11:'emily_buss', 12:'kwan_s12', 13:'blouin_s13', 14:'stephanie_pitcher', 15:'kathleen_riebe',
      16:'harper_s16', 17:'lincoln_fillmore', 18:'mccay_s11', 19:'kcullimore', 20:'rwinterton',
      21:'brammer_s21', 22:'heidi_balderree', 23:'kgrover', 24:'kstratton', 25:'mckell_s25',
      26:'dhinkins', 27:'dowens_st', 28:'evickers', 29:'dipson'`,
  "5 seats added, all 29 districts now named");

// ── 5. index.html: comments that the wiring makes false ─────────────────────
console.log("\nindex.html — comment blocks the new wiring falsifies");
sub("index.html",
  `    // 10, McCay 17→18, Brammer 22→21, Grover 24→23, Stratton added at 24 (he won
    // Bramble's seat and was sworn in Jan 2025). Districts 4, 11, 14, 15, 22 have no
    // roster record yet and are intentionally absent — \`incPid || null\` at the call
    // sites degrades to "no incumbent", which is correct, whereas naming the wrong
    // person is not.`,
  `    // 10, McCay 17→18, Brammer 22→21, Grover 24→23, Stratton added at 24 (he won
    // Bramble's seat and was sworn in Jan 2025).
    //
    // COMPLETE as of the fifth July 2026 pass: all 29 districts are named. The last
    // five — 4, 11, 14, 15, 22 — had been left as no key at all rather than a guess,
    // because none of their senators had a roster record for the tables to check
    // against. Four of the five were already content-bearing under the ids used here
    // and only needed the record: 4 → \`cmusselman\` (Calvin Musselman, R-West Haven,
    // seated Jan 2025 succeeding Gregg Buxton), 11 → \`emily_buss\` (Emily Buss,
    // Forward Party, appointed Dec 2025 to Daniel Thatcher's vacated seat), 14 →
    // \`stephanie_pitcher\` (D-Salt Lake City, seated Jan 2023, previously House
    // District 40), 15 → \`kathleen_riebe\` (D-Cottonwood Heights, Senate Minority
    // Whip, elected 2018 at the pre-redistricting District 8), 22 →
    // \`heidi_balderree\` (R-Saratoga Springs, seated Oct 2023 succeeding Jake
    // Anderegg). Because 10a is bidirectional, an entry here now requires a matching
    // \`_UTAH_SENATE_INFO\` entry whose \`d\` agrees, and vice versa.`,
  "Senate incumbents: 'intentionally absent' note replaced with the completion note");

sub("index.html",
  `    // COMPLETED July 2026: the seven remaining seats (2, 3, 9, 17, 20, 26, 27) that
    // KR_STATE_SENATE_INCUMBENTS wired to invented \`*_sN\` ids are now here under the
    // ids that actually carry each senator's curated content. Every entry in this map
    // now has a matching KR_STATE_SENATE_INCUMBENTS key and vice versa, so assertion
    // 10a in scripts/test-identity-integrity.mjs is BIDIRECTIONAL — adding a senator
    // to one table without the other is a hard failure, not a note.`,
  `    // COMPLETED July 2026: the seven remaining seats (2, 3, 9, 17, 20, 26, 27) that
    // KR_STATE_SENATE_INCUMBENTS wired to invented \`*_sN\` ids are now here under the
    // ids that actually carry each senator's curated content. Every entry in this map
    // now has a matching KR_STATE_SENATE_INCUMBENTS key and vice versa, so assertion
    // 10a in scripts/test-identity-integrity.mjs is BIDIRECTIONAL — adding a senator
    // to one table without the other is a hard failure, not a note.
    //
    // ALL 29 SEATS COVERED as of the fifth July 2026 pass, which added the last five
    // (4, 11, 14, 15, 22). They had been absent because no roster record existed to
    // name their senators, not because the seats were unknown; see the
    // KR_STATE_SENATE_INCUMBENTS comment for each disposition. One consequence worth
    // knowing before editing: this map is now exhaustive, so a NEW key here is either
    // a correction to an existing seat or a mistake — there is no uncovered district
    // left for one to describe. \`emily_buss\` is also the map's only non-R/D member
    // (Forward Party), which is a party value the profile renderer supports.`,
  "_UTAH_SENATE_INFO preamble: records the 29/29 completion");

sub("index.html",
  `    // Add a member here only once their district and county are verified against the
    // public record — a guess here now fails CI in both directions.`,
  `    // A fifth pass swept all 75 seats for the same shape and found eleven more, nine
    // of them roster-less-but-content-bearing (\`verona_mauga\` 31, \`doug_owens\` 33,
    // \`carol_spackman_moss\` 34, \`john_arthur\` 41, \`calvin_roberts\` 46,
    // \`candice_pierucci\` 49, \`leah_hansen\` 51, \`kay_christofferson\` 53,
    // \`doug_welton\` 65) and two — \`mschultz\` 12 and \`aromero\` 25 — a different
    // failure: they had roster records all along and had simply never been added to
    // this map, so nothing checked their own district strings. Both were wrong when
    // checked. Romero's read District 26, a Davis County seat; she has held 25 (west
    // Salt Lake City) since the renumbering. Schultz's named no district at all, so
    // 10h skipped him silently rather than catching it. That is the failure mode an
    // info map exists to close, and it is worth remembering that a member being
    // rostered is not the same as a member being mapped.
    //
    // What the sweep deliberately did NOT wire: roughly twenty ids that look like this
    // same case and are not. \`evan_vickers\` / \`evickers\`, \`ray_ward\` / \`rward\`,
    // \`casey_snider\` / \`snider_h5\` and their like are one person split across two
    // surfaces — a full-name id carrying stances and a roster id carrying the record.
    // The person is already wired under the roster id, so no district is uncovered,
    // and adding the twin would create the parallel identity that the phantom-id
    // clean-up existed to remove. That is merge debt for a separate pass, tracked in
    // scripts/UTAH-LAUNCH-CLEANUP-TRACKER.md.
    //
    // Add a member here only once their district and county are verified against the
    // public record — a guess here now fails CI in both directions.`,
  "_UTAH_HOUSE_INFO preamble: records the sweep and the surface-split exclusion");

sub("index.html",
  `    //   • The 35 districts absent from this table are absent because no id in the data
    //     set holds them. Bidirectionality means an entry here without an info entry now
    //     fails CI, so the honest state of an uncovered seat is no key at all.`,
  `    // CLEARED in the fifth July 2026 pass — a full sweep of all 75 seats against both
    // tables, which turned up nine more members in the roster-less-but-content-bearing
    // state above (31, 33, 34, 41, 46, 49, 51, 53, 65) and two, \`mschultz\` at 12 and
    // \`aromero\` at 25, that had roster records but had never been mapped. Both of the
    // latter carried a wrong or missing district on their own record, which is what
    // being outside _UTAH_HOUSE_INFO had hidden.
    //
    // STILL OPEN, deliberately not guessed at:
    //   • The 24 districts absent from this table are absent because no id in the data
    //     set holds them. Bidirectionality means an entry here without an info entry now
    //     fails CI, so the honest state of an uncovered seat is no key at all.
    //   • Three roster records name a district that belongs to somebody else and are
    //     outside this map, so nothing fails: \`fgibson\` reads District 60 (Grant
    //     Pace's), \`jknotts\` reads District 65 (Doug Welton's) under a name that looks
    //     like a garbled "John Knotwell" — a former District 52 member — and
    //     \`jdraxler\` reads District 3 though he left in 2017. Each is a former-member
    //     label to correct, not a seat to re-key.`,
  "House STILL OPEN note: 35 → 24 absent, plus the three stale roster districts");

// The Power-Map META row was written when Musselman was a state representative.
// Both halves are stale: he has been a SENATOR since Jan 2025, and West Haven is
// Weber County, not Davis. `cwilson` two rows up is the shape to match.
console.log("\nindex.html — Power-Map META row for Musselman");
sub("index.html",
  `      cmusselman:['pm-tier-state','STATE HOUSE','davis','district1'],`,
  `      cmusselman:['pm-tier-state','STATE SENATE','weber','district1'],`,
  "cmusselman: STATE HOUSE/davis → STATE SENATE/weber");

// ── 6. spotlights-data.js: the one label the new records falsify ────────────
// Assertion 6 only compares a card's office against the roster when a roster
// record exists, so this card has never been checked. It calls Pitcher a
// Representative — true until Jan 2023, wrong now, and not time-qualified, so it
// would fail the chamber check the moment her Senate record lands. Her sibling
// card in the criminal-justice block already carries the correct, dated label;
// this copies it verbatim rather than inventing a new phrasing.
console.log("\nspotlights-data.js — Pitcher's chamber label");
sub("spotlights-data.js",
  `{ id: 'stephanie_pitcher', name: 'Stephanie Pitcher', office: 'Utah State Representative · Prosecutor', icon: '🏛', topic: 'AI in Law Enforcement', stance: 'mixed' }`,
  `{ id: 'stephanie_pitcher', name: 'Stephanie Pitcher', office: 'Utah State Senator · Former Prosecutor', icon: '🏛', topic: 'AI in Law Enforcement', stance: 'mixed' }`,
  "'Utah State Representative · Prosecutor' → 'Utah State Senator · Former Prosecutor'");

// ── write ───────────────────────────────────────────────────────────────────
console.log(`\n${applied} edit(s) to apply, ${alreadyDone} already applied, ${failed} failed.`);
if (failed) {
  console.error("Refusing to write: an anchor did not match exactly once.");
  process.exit(1);
}
if (!applied) {
  console.log("Nothing to do — this pass has already run.");
  process.exit(0);
}
if (!APPLY) {
  console.log("Dry run. Re-run with --apply to write.");
  process.exit(0);
}
for (const [rel, src] of files) writeFileSync(join(ROOT, rel), src);
console.log(`Wrote ${files.size} file(s).`);
