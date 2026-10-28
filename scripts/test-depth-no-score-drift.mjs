#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-depth-no-score-drift.mjs — the pass changed what is said, not what is true
// ─────────────────────────────────────────────────────────────────────────────
// A depth caption is worth having only if it is a caption. The moment printing
// "3 issues tested" beside a score also nudges the score — a floor raised so the
// embarrassing 100%s stop appearing, a thin row quietly dropped from the tested
// pool so the denominator looks better — the disclosure has become a second
// scoring pass wearing a caption's clothes, and the honest-looking number is less
// honest than the bare one it replaced.
//
// So this file does not inspect the diff and reason about it. It boots the tree as
// it stood before the pass and the tree as it stands now, side by side in two vm
// contexts, runs both engines over the whole roster, and requires the published
// arithmetic to come out bit-for-bit identical:
//
//   · read()      — pct, publishable, tested, untested, scorable, word, testedWeight
//   · scopedRead()— the same, for the current-term slice and its delta
//   · rowResult() — per-issue state, pct, metric and verdict token, every row
//
// Anything that moves, fails, and names itself. A floor raised to hide a thin
// perfect score would surface here as a profile that used to publish and no longer
// does; a row dropped to flatter a denominator, as a coverage count that shrank.
//
// The baseline is HEAD, read through `git show` — this file never reaches into the
// .git directory itself.
//
//   node scripts/test-depth-no-score-drift.mjs

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { declaredStanceMovesAtHead } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Every file the score is computed from, in load order. Presentation-only files
// (css, hero-showcase, ballot-breakdown, index.html) are absent by design: they
// cannot reach the arithmetic, and loading them would let a rendering difference
// masquerade as a scoring one.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "consistency.js", "voting-record.js", "word-action.js",
];

const nowSrc = (f) => readFileSync(join(ROOT, f), "utf8");
const headSrc = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) { return null; }
};

function boot(get, label) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of FILES) {
    const src = get(f);
    if (src === null) { console.error(`  ! ${label}: ${f} unavailable`); continue; }
    try { vm.runInContext(src, ctx, { filename: `${label}:${f}` }); }
    catch (e) { console.error(`  ! ${label}/${f}: ${e.message}`); }
  }
  return win;
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

section("booting both trees");
const before = boot(headSrc, "HEAD");
const after = boot(nowSrc, "working");
ok(!!(before.PDXWordAction && before.PDXWordAction.read), "the pre-pass engine booted");
ok(!!(after.PDXWordAction && after.PDXWordAction.read), "the current engine booted");
if (failures.length) {
  console.error(`\n✗ score drift: could not boot both trees\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}

const PIDS = Object.keys(before.CMP_DATA || {});
ok(PIDS.length > 100, `the roster booted (${PIDS.length} profiles)`);

// ── Roster identity: additions are work, removals and reorders are drift ─────
// Read literally, "the roster is byte-identical" is a freeze on identity repair.
// A pid can sit in the ballot resolver as a district's officeholder with no
// record behind it, and the seat then paints "no candidates on file" — a claim
// about the world, and a false one. Fixing that means ADDING a roster record, and
// a guard that forbids it would be protecting the bug.
//
// So an addition is allowed, named here, and required to be inert: it must be a
// pid HEAD did not have, and everyone HEAD did have must still be present, in the
// same relative order, with every score below unchanged. A removal or a reorder
// still fails, because neither can be a repair.
//
const ADDED = {
  // August 2026 ballot seat pack:
  //   kstratton · Keven J. Stratton, Utah Senate District 24 (Provo / Orem), the
  //               seat's officeholder since Jan 2025. He was already SD-24's
  //               incumbent in ballot-breakdown.js with no record behind the id.
  kstratton: "SD-24 officeholder — pid existed in the ballot resolver with no roster record",

  // August 2026 Utah data wave 2, priority 1. Twenty-seven Utah legislators cast
  // recorded votes in the 2025 General Session that scripts/vr-utah-ingest.mjs
  // parsed and then DISCARDED, because db/vr-utah-member-map.json can only map a
  // printed name onto a roster id and there was no record here to map onto. All
  // twenty-seven are identity-only: score null, kept/broken/pending 0, and
  // `issues` lifted verbatim from the stance block the data set already carried
  // for twenty-five of them. Twenty-three are sitting representatives; the last
  // four are former members whose seats are held by someone else here, which is
  // precisely why they need their own records — a 2025 vote may never land on a
  // successor. See the comment block in cmp-data.js for the per-name confirmation.
  thomas_peterson:     "HD-1 (Box Elder / Cache) — 2025GS floor votes were parsed and dropped for want of a roster record",
  mike_petersen:       "HD-2 (Cache) — 2025GS floor votes were parsed and dropped for want of a roster record",
  jason_thompson:      "HD-3 (Cache) — 2025GS floor votes were parsed and dropped for want of a roster record",
  ryan_d_wilcox:       "HD-7 (Weber) — 2025GS floor votes were parsed and dropped for want of a roster record",
  jason_b_kyle:        "HD-8 (Morgan / Weber) — 2025GS floor votes were parsed and dropped for want of a roster record",
  karen_m_peterson:    "HD-13 (Davis) — 2025GS floor votes were parsed and dropped for want of a roster record",
  stewart_e_barlow:    "HD-17 (Davis) — 2025GS floor votes were parsed and dropped for want of a roster record",
  paul_a_cutler:       "HD-18 (Davis) — 2025GS floor votes were parsed and dropped for want of a roster record",
  mballard:            "HD-20 (Davis) — 2025GS floor votes were parsed and dropped for want of a roster record",
  matt_macpherson:     "HD-26 (Salt Lake) — 2025GS floor votes were parsed and dropped for want of a roster record",
  anthony_loubet:      "HD-27 (Salt Lake) — 2025GS floor votes were parsed and dropped for want of a roster record",
  sahara_hayes:        "HD-32 (Salt Lake) — 2025GS floor votes were parsed and dropped for want of a roster record",
  rosalba_dominguez:   "HD-35 (Salt Lake) — 2025GS floor votes were parsed and dropped for want of a roster record",
  cheryl_acton:        "HD-38 (Salt Lake) — 2025GS floor votes were parsed and dropped for want of a roster record",
  andrew_stoddard:     "HD-40 (Salt Lake) — 2025GS floor votes were parsed and dropped for want of a roster record",
  mark_strong:         "HD-47 (Salt Lake) — 2025GS floor votes were parsed and dropped for want of a roster record",
  doug_fiefia:         "HD-48 (Salt Lake) — 2025GS floor votes were parsed and dropped for want of a roster record",
  kristen_chevrier:    "HD-54 (Utah) — 2025GS floor votes were parsed and dropped for want of a roster record",
  nelson_abbott:       "HD-57 (Utah) — 2025GS floor votes were parsed and dropped for want of a roster record",
  david_shallenberger: "HD-58 (Utah) — 2025GS floor votes were parsed and dropped for want of a roster record",
  nthurston:           "HD-62 (Utah) — 2025GS floor votes were parsed and dropped for want of a roster record",
  joseph_elison:       "HD-72 (Washington) — 2025GS floor votes were parsed and dropped for want of a roster record",
  r_neil_walter:       "HD-74 (Washington) — 2025GS floor votes were parsed and dropped for want of a roster record",
  gay_lynn_bennion:    "HD-41 until Dec 2025 — former member; john_arthur holds the seat — 2025GS floor votes were parsed and dropped for want of a roster record",
  jefferson_moss:      "HD-51 until Jul 2025 — former member; leah_hansen holds the seat — 2025GS floor votes were parsed and dropped for want of a roster record",
  jefferson_burton:    "HD-64 until May 2026 — former member; jackie_larson holds the seat — 2025GS floor votes were parsed and dropped for want of a roster record",
  daniel_thatcher:     "SD-11 until Dec 2025 — former member; emily_buss holds the seat — 2025GS floor votes were parsed and dropped for want of a roster record",

  // August 2026 Utah data wave 6. Sixteen Utah legislators cast recorded
  // COMMITTEE votes in the 2023 and 2024 general sessions that
  // scripts/vr-utah-committee-ingest.mjs parsed and then DISCARDED for the same
  // reason as the twenty-seven above: a printed name can only be mapped onto a
  // roster id, and there was no record here to map onto. Fourteen were seated in
  // both sessions; anderegg and kotter only in 2023, which is why the 2023 name
  // map had to be reviewed on its own rather than copied from 2024. All sixteen
  // are identity-only — score null, kept/broken/pending 0, `issues` carrying the
  // district as a plain fact — and every field is off the Legislature's roster
  // page for the session in question — the district is the only geography the
  // roster page gives, so the district is all that is claimed here. See the
  // comment block in cmp-data.js.
  kera_birkeland:    "HD-4 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  david_buxton:      "SD-4 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  joel_briscoe:      "HD-24 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  james_cobb:        "HD-48 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  brett_garner:      "HD-31 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  tim_jimenez:       "HD-28 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  brian_king:        "HD-23 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  rosemary_lesser:   "HD-10 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  steven_lund:       "HD-66 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  susan_pulsipher:   "HD-45 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  judy_weeks_rohner: "HD-30 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  robert_spendlove:  "HD-42 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  jeffrey_stenquist: "HD-46 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  mark_wheatley:     "HD-35 — 2023GS and 2024GS committee votes were parsed and dropped for want of a roster record",
  jacob_anderegg:    "SD-22 seated 2023 only; heidi_balderree holds the seat — 2023GS committee votes were parsed and dropped for want of a roster record",
  quinn_kotter:      "HD-26 seated 2023 only; matt_macpherson holds the seat — 2023GS committee votes were parsed and dropped for want of a roster record",

  // October 2026 Davis County third-party nominees. Five Forward / Constitution
  // nominees on the November 3, 2026 ballot whose seats' race lists showed only
  // the major-party field. Identity-only: score null, kept/broken/pending 0, no
  // issues. See the comment block in cmp-data.js.
  josh_smith:     "SD-6 Forward nominee — the race list held his opponents and not him",
  jeffrey_ostler: "SD-7 Constitution nominee — the race list held his opponents and not him",
  james_rich:     "HD-6 Forward nominee — the race list held only the sitting member",
  libby_shelton:  "HD-8 Forward nominee — the race list held only the sitting member",
  tony_de_mille:  "HD-13 Forward nominee — the race list held his opponents and not him",

  // October 2026 Utah statewide third-party and unaffiliated nominees: same
  // shape, same reason — identity-only rows for nominees the race lists lacked.
  jesse_west: "Libertarian nominee, U.S. House Candidate (UT-1)",
  elias_montgomery: "Unaffiliated nominee, U.S. House Candidate (UT-1)",
  carlton_bowen: "Independent American nominee, U.S. House Candidate (UT-2)",
  daniel_cottam: "Libertarian nominee, U.S. House Candidate (UT-2)",
  robert_moesinger: "Unaffiliated nominee, U.S. House Candidate (UT-2)",
  cassie_easley: "Constitution nominee, U.S. House Candidate (UT-3)",
  michael_stoddard: "Libertarian nominee, U.S. House Candidate (UT-3)",
  adonis_hooslyn: "Unaffiliated nominee, U.S. House Candidate (UT-3)",
  ayden_scott: "Unaffiliated nominee, U.S. House Candidate (UT-3)",
  taylor_wright: "Libertarian nominee, U.S. House Candidate (UT-4)",
  steven_burt: "Unaffiliated nominee, U.S. House Candidate (UT-4)",
  julie_quinlan: "Forward nominee, Utah State Senate Candidate (District 1)",
  j_lowry_snow: "Forward nominee, Utah State Senate Candidate (District 9)",
  colin_smith: "Forward nominee, Utah State Senate Candidate (District 13)",
  annette_mcrae: "Forward nominee, Utah State Senate Candidate (District 20)",
  wayne_woodfield: "Forward nominee, Utah State Senate Candidate (District 21)",
  jason_odell: "Constitution nominee, Utah State House Candidate (District 1)",
  patrick_belmont: "Unaffiliated nominee, Utah State House Candidate (District 3)",
  cabot_nelson: "Forward nominee, Utah State House Candidate (District 23)",
  wales_nematollahi: "Forward nominee, Utah State House Candidate (District 28)",
  tynley_bean: "Forward nominee, Utah State House Candidate (District 29)",
  john_boyd: "Forward nominee, Utah State House Candidate (District 53)",
  julie_smith: "Forward nominee, Utah State House Candidate (District 63)",
  alan_wessman: "Unaffiliated nominee, Utah State House Candidate (District 64)",
  zeno_parry: "Forward nominee, Utah State House Candidate (District 70)",

  // October 2026 Utah House third-party nominees, wave 3: same shape, same reason.
  jonathan_garrard: "Constitution nominee, Utah State House Candidate (District 29)",
  sergio_sotelo: "Unaffiliated nominee, Utah State House Candidate (District 38)",
  jennifer_doud: "Constitution nominee, Utah State House Candidate (District 61)",
  russ_hatch: "Constitution nominee, Utah State House Candidate (District 66)",
  sonya_ray: "Constitution nominee, Utah State House Candidate (District 68)",
  april_pinkston: "Constitution nominee, Utah State House Candidate (District 72)",

  // October 2026 federal third-party and independent nominees, batch 1: same
  // shape, same reason, on U.S. House and U.S. Senate seats outside Utah.
  will_johanson: "Libertarian nominee, U.S. House Candidate (ID-2)",
  cory_robertson: "Libertarian nominee, U.S. House Candidate (CO-3)",
  monica_alponte: "Libertarian nominee, U.S. House Candidate (AZ-1)",
  shawn_johnson: "Libertarian nominee, U.S. House Candidate (WY-AL)",
  jeff_haggit: "Constitution nominee, U.S. House Candidate (WY-AL)",
  tom_schmitz: "Libertarian nominee, U.S. House Candidate (MO-1)",
  brandon_daugherty: "Libertarian nominee, U.S. House Candidate (MO-2)",
  bill_hill: "Independent nominee, U.S. House Candidate (AK-AL)",
  sarah_zabel: "Independent nominee, U.S. House Candidate (ID-1)",
  dan_osborn: "Independent nominee, U.S. Senate Candidate (Nebraska)",
  brian_bengs: "Independent nominee, U.S. Senate Candidate (South Dakota)",
  todd_achilles: "Independent nominee, U.S. Senate Candidate (Idaho)",

  // October 2026 federal third-party and independent nominees, batch 2.
  seth_bodnar: "Independent nominee, U.S. Senate Candidate (Montana)",
  ty_pinkins: "Independent nominee, U.S. Senate Candidate (Mississippi)",
  rebecca_whiting: "Libertarian nominee, U.S. Senate Candidate (Minnesota)",
  marisa_simonetti: "Independent nominee, U.S. Senate Candidate (Minnesota)",
  jeff_wadlin: "Libertarian nominee, U.S. Senate Candidate (Arkansas)",
  natalie_fleming: "Independent nominee, U.S. Senate Candidate (Idaho)",
  matt_loesby: "Libertarian nominee, U.S. Senate Candidate (Idaho)",
  kyle_austin: "Libertarian nominee, U.S. Senate Candidate (Montana)",
  lydia_christensen: "Libertarian nominee, U.S. Senate Candidate (Michigan)",
  douglas_marsh: "Green nominee, U.S. Senate Candidate (Michigan)",
  shannon_bray: "Libertarian nominee, U.S. Senate Candidate (North Carolina)",
  ted_brown: "Libertarian nominee, U.S. Senate Candidate (Texas)",

  // October 2026 federal third-party and independent nominees, batch 3.
  blake_huber: "Libertarian nominee, U.S. Senate Candidate (Colorado)",
  bill_redpath: "Libertarian nominee, U.S. Senate Candidate (Ohio)",
  s_marshall_wilson: "Constitution nominee, U.S. Senate Candidate (West Virginia)",
  jim_mcdermott: "Libertarian nominee, U.S. House Candidate (AK-AL)",
  gary_swing: "Green nominee, U.S. House Candidate (AZ-6)",
  mark_elworth: "Libertarian nominee, U.S. House Candidate (CO-5)",
  jacob_anders: "Independent nominee, U.S. House Candidate (TN-4)",
  helene_neville: "Independent nominee, U.S. House Candidate (ND-AL)",

  // October 2026 federal third-party and independent nominees, batch 4.
  sevier_white: "Libertarian nominee, U.S. Senate Candidate (Oklahoma)",
  ron_meinhardt: "Independent nominee, U.S. Senate Candidate (Oklahoma)",
  curtis_stinnett: "Independent nominee, U.S. Senate Candidate (Oklahoma)",
  gary_dye: "Libertarian nominee, U.S. Senate Candidate (Oregon)",
  chris_henry: "Pacific Green / Progressive nominee, U.S. Senate Candidate (Oregon)",
  michael_bahry: "Independent nominee, U.S. Senate Candidate (Rhode Island)",
  mark_hackett: "Constitution nominee, U.S. Senate Candidate (South Carolina)",
  kasie_whitener: "Libertarian nominee, U.S. Senate Candidate (South Carolina)",
  tharon_chandler: "Independent nominee, U.S. Senate Candidate (Tennessee)",
  andrew_gerena: "Independent nominee, U.S. Senate Candidate (Tennessee)",
  jeremy_hearn: "Independent nominee, U.S. Senate Candidate (Tennessee)",
  robert_jones: "Independent nominee, U.S. Senate Candidate (Tennessee)",
  james_macon: "Independent nominee, U.S. Senate Candidate (Tennessee)",
  yoshi_matthews: "Independent nominee, U.S. Senate Candidate (Tennessee)",
  david_sutman: "Independent nominee, U.S. Senate Candidate (Tennessee)",
  catherine_whitson: "Independent nominee, U.S. Senate Candidate (Tennessee)",
  neil_gillespie: "No Party Affiliation nominee, U.S. Senate Candidate (Florida)",
  christopher_campbell: "Kentucky Party nominee, U.S. Senate Candidate (Kentucky)",
  shiva_ayyadurai: "Unenrolled nominee, U.S. Senate Candidate (Massachusetts)",
  joseph_tache: "Party for Socialism and Liberation nominee, U.S. Senate Candidate (Massachusetts)",
  edmond_laplante: "Constitution nominee, U.S. Senate Candidate (New Hampshire)",
  veronica_fernandez: "End the Corruption! nominee, U.S. Senate Candidate (New Jersey)",
  joanne_kuniansky: "Socialist Workers Party nominee, U.S. Senate Candidate (New Jersey)",
  whitfield_harrington: "American Center Party nominee, U.S. Senate Candidate (Illinois)",
  thomas_laehn: "Libertarian nominee, U.S. Senate Candidate (Iowa)",
  david_graham: "Libertarian nominee, U.S. Senate Candidate (Kansas)",
  geral_staten: "Independent nominee, U.S. House Candidate (VA-2)",
  j_matt_baker: "Independent nominee, U.S. House Candidate (VA-2)",
  taner_demirci_lopez: "Libertarian nominee, U.S. House Candidate (VA-7)",
  shelly_arnoldi: "Libertarian nominee, U.S. House Candidate (VA-8)",
  dianne_blais: "Green nominee, U.S. House Candidate (VA-11)",
  tyler_davis: "No Party Affiliation nominee, U.S. House Candidate (FL-1)",
  andrew_parrott: "Libertarian nominee, U.S. House Candidate (FL-6)",
  christopher_dennison: "Libertarian nominee, U.S. House Candidate (FL-7)",
  ralph_groves: "Libertarian nominee, U.S. House Candidate (FL-11)",
  kedner_maxime: "Independent nominee, U.S. House Candidate (FL-20)",
  thomas_loecken: "Independent nominee, U.S. House Candidate (KY-2)",
  jeremy_todd: "Libertarian nominee, U.S. House Candidate (KY-4)",
  gerardo_serrano: "Independent nominee, U.S. House Candidate (KY-5)",
  mikel_wein: "Independent nominee, U.S. House Candidate (KY-5)",
  jay_bowman: "Independent nominee, U.S. House Candidate (KY-6)",
  pete_lynch: "Kentucky Party nominee, U.S. House Candidate (KY-6)",
  ramon_mora: "Independent nominee, U.S. House Candidate (NJ-2)",
  ryan_kelly: "Affordability, Accountability, People nominee, U.S. House Candidate (NJ-3)",
  terrisa_bukovinac: "Save Our Babies nominee, U.S. House Candidate (NJ-9)",
  alan_bond: "Hope for Tomorrow nominee, U.S. House Candidate (NJ-11)",
  ed_hershey: "Working Class Party nominee, U.S. House Candidate (IL-4)",
  chris_getty: "Independent nominee, U.S. House Candidate (IL-4)",
  michael_bridgford: "No Party nominee, U.S. House Candidate (IA-1)",
  rick_stewart: "Libertarian nominee, U.S. House Candidate (IA-2)",
  dave_bushaw: "No Party nominee, U.S. House Candidate (IA-2)",
  john_hauer: "Libertarian nominee, U.S. House Candidate (KS-2)",
  steve_hohe: "Libertarian nominee, U.S. House Candidate (KS-3)",

  // October 2026 Utah major-party nominees the roster did not hold: same
  // shape, same reason, per the Utah Lt. Governor's 2026 candidate filings.
  ben_mcadams: "Democratic nominee, U.S. House Candidate (UT-1)",
  riley_owen: "Republican nominee, U.S. House Candidate (UT-1)",
  peter_crosby: "Democratic nominee, U.S. House Candidate (UT-2)",
  kent_udell: "Democratic nominee, U.S. House Candidate (UT-3)",
  jonny_larsen: "Democratic nominee, U.S. House Candidate (UT-4)",
  claudia_bigler: "Democratic nominee, Utah State Senate Candidate (District 1)",
  christina_cj_hernandez: "Democratic nominee, Utah State Senate Candidate (District 5)",
  jared_neal: "Democratic nominee, Utah State Senate Candidate (District 6)",
  garret_rushforth: "Democratic nominee, Utah State Senate Candidate (District 7)",
  stephanie_hollist: "Republican nominee, Utah State Senate Candidate (District 7)",
  thaddeus_a_evans: "Republican nominee, Utah State Senate Candidate (District 9)",
  brooks_benson: "Republican nominee, Utah State Senate Candidate (District 11)",
  deidre_tyler: "Republican nominee, Utah State Senate Candidate (District 12)",
  ryan_l_mahoney: "Republican nominee, Utah State Senate Candidate (District 13)",
  silvia_catten: "Democratic nominee, Utah State Senate Candidate (District 13)",
  a_dane_anderson: "Democratic nominee, Utah State Senate Candidate (District 18)",
  shana_anderson: "Democratic nominee, Utah State Senate Candidate (District 19)",
  kandee_myers: "Democratic nominee, Utah State Senate Candidate (District 21)",
  tucker_smith: "Democratic nominee, Utah State Senate Candidate (District 23)",
  richard_robillard: "Democratic nominee, Utah State Senate Candidate (District 28)",
  chris_reid: "Democratic nominee, Utah State House Candidate (District 1)",
  barbara_haggerty: "Democratic nominee, Utah State House Candidate (District 2)",
  zane_woolstenhulme: "Democratic nominee, Utah State House Candidate (District 4)",
  kendra_penry: "Democratic nominee, Utah State House Candidate (District 5)",
  bianca_mittendorf: "Democratic nominee, Utah State House Candidate (District 7)",
  kim_james: "Democratic nominee, Utah State House Candidate (District 8)",
  angela_choberka: "Democratic nominee, Utah State House Candidate (District 9)",
  jim_alvey: "Republican nominee, Utah State House Candidate (District 10)",
  dave_calder: "Democratic nominee, Utah State House Candidate (District 11)",
  anna_graff: "Democratic nominee, Utah State House Candidate (District 12)",
  erik_r_craythorne: "Republican nominee, Utah State House Candidate (District 13)",
  jeffrey_anderson: "Democratic nominee, Utah State House Candidate (District 13)",
  brandon_young: "Democratic nominee, Utah State House Candidate (District 14)",
  john_taylor: "Republican nominee, Utah State House Candidate (District 14)",
  anne_berbert: "Democratic nominee, Utah State House Candidate (District 15)",
  abigail_treasure: "Democratic nominee, Utah State House Candidate (District 16)",
  eric_last: "Democratic nominee, Utah State House Candidate (District 17)",
  lili_bitner: "Republican nominee, Utah State House Candidate (District 17)",
  scott_troxel: "Democratic nominee, Utah State House Candidate (District 18)",
  phil_graves: "Democratic nominee, Utah State House Candidate (District 20)",
  stephen_otterstrom: "Democratic nominee, Utah State House Candidate (District 21)",
  char_varga: "Republican nominee, Utah State House Candidate (District 22)",
  franklin_robinson: "Republican nominee, Utah State House Candidate (District 23)",
  braeden_oswald: "Republican nominee, Utah State House Candidate (District 24)",
  richard_nowak: "Republican nominee, Utah State House Candidate (District 25)",
  michael_finch: "Democratic nominee, Utah State House Candidate (District 26)",
  liz_oates: "Democratic nominee, Utah State House Candidate (District 27)",
  anita_dalrymple: "Democratic nominee, Utah State House Candidate (District 28)",
  sara_snow: "Democratic nominee, Utah State House Candidate (District 29)",
  sheldon_birch: "Republican nominee, Utah State House Candidate (District 29)",
  dave_parke: "Republican nominee, Utah State House Candidate (District 30)",
  melody_jones: "Republican nominee, Utah State House Candidate (District 31)",
  aileen_hampton: "Republican nominee, Utah State House Candidate (District 32)",
  anna_reeves: "Republican nominee, Utah State House Candidate (District 33)",
  julie_jackson: "Democratic nominee, Utah State House Candidate (District 34)",
  monique_ketcham: "Republican nominee, Utah State House Candidate (District 35)",
  blake_townsend: "Democratic nominee, Utah State House Candidate (District 36)",
  casey_saxton: "Republican nominee, Utah State House Candidate (District 37)",
  chris_mcconnehey: "Republican nominee, Utah State House Candidate (District 38)",
  drew_howells: "Democratic nominee, Utah State House Candidate (District 39)",
  darren_croft: "Republican nominee, Utah State House Candidate (District 41)",
  iva_williams: "Democratic nominee, Utah State House Candidate (District 42)",
  ofa_matagi: "Democratic nominee, Utah State House Candidate (District 43)",
  jess_birtcher: "Democratic nominee, Utah State House Candidate (District 44)",
  rod_moser: "Democratic nominee, Utah State House Candidate (District 45)",
  braxten_rutherford: "Democratic nominee, Utah State House Candidate (District 46)",
  benyde_walker: "Democratic nominee, Utah State House Candidate (District 48)",
  jake_hunsaker: "Republican nominee, Utah State House Candidate (District 48)",
  lillian_bowles: "Democratic nominee, Utah State House Candidate (District 49)",
  kristin_meyer: "Democratic nominee, Utah State House Candidate (District 50)",
  brett_nielsen: "Democratic nominee, Utah State House Candidate (District 51)",
  nicole_melling: "Democratic nominee, Utah State House Candidate (District 52)",
  kevin_slater: "Democratic nominee, Utah State House Candidate (District 53)",
  kristina_robinson: "Democratic nominee, Utah State House Candidate (District 54)",
  travis_hysell: "Democratic nominee, Utah State House Candidate (District 55)",
  natassja_grossman: "Democratic nominee, Utah State House Candidate (District 56)",
  karli_black: "Democratic nominee, Utah State House Candidate (District 58)",
  celeste_johnson: "Democratic nominee, Utah State House Candidate (District 59)",
  alan_jimenez: "Democratic nominee, Utah State House Candidate (District 61)",
  david_chappell: "Democratic nominee, Utah State House Candidate (District 62)",
  mark_youngquist: "Democratic nominee, Utah State House Candidate (District 63)",
  breanne_mashek: "Democratic nominee, Utah State House Candidate (District 66)",
  carl_ingwell: "Democratic nominee, Utah State House Candidate (District 67)",
  jr_bird: "Republican nominee, Utah State House Candidate (District 67)",
  tracie_yellowman_tso: "Democratic nominee, Utah State House Candidate (District 69)",
  stacey_pendergraft: "Democratic nominee, Utah State House Candidate (District 70)",
  thomas_loveheart: "Democratic nominee, Utah State House Candidate (District 71)",
  eva_weldon: "Democratic nominee, Utah State House Candidate (District 72)",
  glenn_webb: "Democratic nominee, Utah State House Candidate (District 73)",
  jeffrey_lipe: "Democratic nominee, Utah State House Candidate (District 74)",
  rebecca_winsor: "Democratic nominee, Utah State House Candidate (District 75)",
};
// ── The same allowance, at roster-wave scale, sourced instead of typed ───────
// ADDED above works because each entry is a line a reviewer reads. A FEDERAL roster wave
// breaks that: federal_roster_r1_sep2026 admits 315 sitting House members at once, because
// the House corpus held 7,298 recorded positions the fail-closed ingest had to skip for want
// of a roster slug — the identical situation as the Utah entries above, three hundred times
// over. Three hundred typed reason strings would be a worse document than the two committed
// files this reads instead, so the allowance is SOURCED, and it is narrower than a typed line:
//
//   1. the pid must already be on the roster CEILING — some wave's slug list in
//      db/vr-roster-admitted.json — which is the only admission path the map generator will
//      honour in either direction. Which wave admitted it does not matter and must not:
//      federal_roster_r2_sep2026's twelve were admitted to the ceiling by f6, f8 and the
//      Israel-support wave and had votes resolving through db/vr-member-map.json for waves,
//      which is exactly why they needed a roster row and exactly why R2 wrote one.
//   2. it must have a census entry in one of the federal roster censuses carrying at least
//      two independent verifiedBy sources (the chamber's own roster and the legislators
//      dataset), which is what "verified twice" means for a Bioguide↔slug pair; and
//   3. the row it adds must be INERT — score null, kept/broken/pending 0, no issues. An
//      admission that arrived carrying a score would fail here even though it is on the list.
//
// A pid that satisfies none of these is still an unnamed addition and still fails.
const rosterWaveAdmissions = (() => {
  const out = new Map();
  let waves;
  try { waves = JSON.parse(readFileSync(join(ROOT, "db/vr-roster-admitted.json"), "utf8")).waves || {}; } catch { return out; }
  const onCeiling = new Set();
  for (const [k, list] of Object.entries(waves)) {
    if (!Array.isArray(list)) continue;                       // _note is a string
    for (const slug of list) onCeiling.add(slug);
    void k;
  }
  for (const file of ["db/vr-federal-roster-r1-census.json", "db/vr-federal-roster-r2-census.json"]) {
    let census;
    try { census = JSON.parse(readFileSync(join(ROOT, file), "utf8")); } catch { continue; }
    for (const rec of census.admitted || []) {
      if (!onCeiling.has(rec.slug)) continue;
      if (!Array.isArray(rec.verifiedBy) || rec.verifiedBy.length < 2) continue;
      const seat = rec.districtLabel || rec.stateLabel || rec.state;
      out.set(rec.slug, `${seat} · Bioguide ${rec.bioguide} — roll-call positions were parsed and skipped for want of a roster slug`);
    }
  }
  return out;
})();

{
  const now = Object.keys(after.CMP_DATA || {});
  const nowSet = new Set(now);
  const gone = PIDS.filter((p) => !nowSet.has(p));
  eq(gone.join("|"), "", "the pass removed someone from the roster");

  const added = now.filter((p) => PIDS.indexOf(p) < 0);
  // The October 2026 candidates outside Utah: 869 identity rows, each named with its
  // official source in db/roster-candidates-2026-oct.json, and held to the same inert
  // rule as a roster wave — plus `candidate: true`, so none can read as a member.
  const candidateBatch = (() => {
    try { return new Set(JSON.parse(readFileSync(join(ROOT, "db/roster-candidates-2026-oct.json"), "utf8")).rows.map((r) => r.pid)); }
    catch { return new Set(); }
  })();
  const notInertCandidates = added.filter((p) => candidateBatch.has(p)).filter((p) => {
    const r = (after.CMP_DATA || {})[p] || {};
    return r.candidate !== true || r.score !== null || r.kept !== 0 || r.broken !== 0 || r.pending !== 0
      || !Array.isArray(r.issues) || r.issues.length !== 0;
  });
  eq(notInertCandidates.join("|"), "",
    "a 2026 candidate row arrived carrying a judged surface or without candidate: true");
  // The October 2026 state legislator shells (California, Texas and Florida; New
  // York, Pennsylvania and Illinois; Ohio, Georgia and North Carolina): identity rows, each named with its official
  // chamber roster in db/roster-state-legislators-*-2026-oct.json, inert, and
  // `candidate: false`.
  const legislatorBatch = (() => {
    const out = new Set();
    for (const f of ["db/roster-state-legislators-ca-tx-fl-2026-oct.json", "db/roster-state-legislators-ny-pa-il-2026-oct.json",
                     "db/roster-state-legislators-oh-ga-nc-2026-oct.json", "db/roster-state-legislators-mi-nj-va-2026-oct.json",
                     "db/roster-state-legislators-wa-az-ma-2026-oct.json", "db/roster-state-legislators-tn-in-mo-2026-oct.json"]) {
      try { for (const r of JSON.parse(readFileSync(join(ROOT, f), "utf8")).rows) out.add(r.pid); } catch {}
    }
    // The sitting Minnesota, Colorado, Nevada and Washington members in the
    // contested 2026 races, one identity shell each, named by the races their
    // ballot files hold (Washington's House shells also name their position).
    for (const [f, g] of [["mn-ballot-2026.js", "PDXMnBallot"], ["co-ballot-2026.js", "PDXCoBallot"], ["nv-ballot-2026.js", "PDXNvBallot"],
                          ["wa-ballot-2026.js", "PDXWaBallot"]]) {
      try {
        const w = {}; w.window = w;
        vm.runInContext(readFileSync(join(ROOT, f), "utf8"), vm.createContext(w));
        for (const r of w[g].RACES) for (const c of r.field) if (c.pid) out.add(c.pid);
      } catch {}
    }
    return out;
  })();
  const notInertLegislators = added.filter((p) => legislatorBatch.has(p)).filter((p) => {
    const r = (after.CMP_DATA || {})[p] || {};
    return r.candidate !== false || r.score !== null || r.kept !== 0 || r.broken !== 0 || r.pending !== 0
      || !Array.isArray(r.issues) || r.issues.length !== 0;
  });
  eq(notInertLegislators.join("|"), "",
    "a state legislator shell arrived carrying a judged surface or without candidate: false");
  const unnamed = added.filter((p) => !ADDED[p] && !rosterWaveAdmissions.has(p) && !candidateBatch.has(p) && !legislatorBatch.has(p));

  // Clause 3: every sourced admission is inert. Typed ADDED entries are not held to this —
  // kstratton and the Utah waves predate the rule and are audited by their own line.
  const notInert = added.filter((p) => rosterWaveAdmissions.has(p)).filter((p) => {
    const r = (after.CMP_DATA || {})[p] || {};
    return r.score !== null || r.kept !== 0 || r.broken !== 0 || r.pending !== 0
      || !Array.isArray(r.issues) || r.issues.length !== 0;
  });
  eq(notInert.join("|"), "",
    "a roster-wave admission arrived carrying a judged surface — admitting a member is identity, never a score");
  eq(unnamed.join("|"), "",
    "the pass added a profile that is not named in ADDED above");

  // Everyone HEAD had, in HEAD's order, ignoring where the new ids landed.
  eq(now.filter((p) => PIDS.indexOf(p) >= 0).join("|"), PIDS.join("|"),
    "the pass reordered the existing roster");
  eq(now.length, PIDS.length + added.length, "the roster count does not add up");
}

// ═════════════════════════════════════════════════════════════════════════════
section("read() — the published figure, its floors, and its coverage");
// ═════════════════════════════════════════════════════════════════════════════
// The whole shape, not just pct. `publishable` is where a raised floor would show;
// `tested`/`scorable` is where a quietly re-pooled row would.
const READ_KEYS = ["pct", "publishable", "word", "testedWeight"];
const COV_KEYS = ["word", "scorable", "tested", "untested", "issueLinked",
                  "notIssueLinked", "recordDerived", "warming"];

// ── Profiles this pass curated, and what that is allowed to move ─────────────
// Comparing the working tree to HEAD catches a formula that drifted. Read
// literally it also catches a curator who added a sourced position, because a
// profile with one more stated position has one more word row — and that is the
// work, not the drift. Freezing coverage forever would make this file a freeze on
// curation, which is not what it was written to protect.
//
// So a named profile may move its COVERAGE, and nothing else. `pct`,
// `publishable` and `testedWeight` are still held bit-for-bit for everyone, every
// row that exists in both trees is still compared in full, and a curated profile
// has the extra burden of showing that its rows only ever GREW: same rows, same
// order, additions at the end. A floor lowered or a row quietly dropped still
// fails here, on this list or off it.
//
// August 2026 densification pass — scripts/vr-densify-stances-aug2026.mjs:
//   french_hill / gov_regulation  · re-sourced off a vote-derived sentence
//   massie      / privacy_rights  · re-sourced off a vote-derived sentence
//   boebert     / privacy_rights  · first sourced position on the key
//
// August 2026 circular-stance rewrite — scripts/vr-audit-share-eligibility-aug2026.mjs:
//   87 stance sentences that were a restatement of the roll call under them were
//   rewritten as the stated position instead, so the share layer's circularity
//   guard stops refusing them. Votes, mappings, issue keys and directions were not
//   touched. Where the rewrite made a card independent word for the first time, the
//   engine reclassifies it out of recordDerived and into the scorable pool — the
//   movement below is that reclassification and nothing else.
const CURATED = {
  french_hill: "gov_regulation re-sourced from a Financial Services letter",
  massie: "privacy_rights re-sourced from the Surveillance Accountability Act release",
  boebert: "privacy_rights added from her own quoted statement",
  aoc: "strong_defense re-worded off a vote-derived sentence",
  bennie_thompson: "gun_safety re-worded off a vote-derived sentence",
  bruce_westerman: "lands_balance re-worded off a vote-derived sentence",
  curtis: "infrastructure re-worded off a vote-derived sentence",
  deb_fischer: "states_federal_power re-worded off a vote-derived sentence",
  mike_collins: "border_security re-worded off a vote-derived sentence",
  mike_flood: "housing_build re-worded off a vote-derived sentence",
  rick_crawford: "gun_rights and border_security re-worded off vote-derived sentences",
  trent_kelly: "gun_rights re-worded off a vote-derived sentence",
  troy_downing: "enviro_energy re-worded off a vote-derived sentence",
};

// August 2026 publishing-floor lift — 66 profiles that held a deep formal record
// (25+ scored items, many over a hundred) and published no Direction Match, because
// the roll calls had almost nothing stated to test them against. Each one below
// gained sourced stated positions — a floor speech, press release, issues page or
// op-ed, never the clerk tally for the vote that tests it — until it cleared the
// UNCHANGED floor of three tested items and weight four.
//
// This is the one movement a drift test must let through and the one it is most
// tempted to forbid, so the licence is deliberately narrow. A lifted profile must
// have been UNPUBLISHABLE before (a lift may not quietly re-score a figure that was
// already on the page), must publish now, must have GROWN its tested weight and its
// independently-sourced positions, and every row it already had tested must read
// exactly as it did. Lowering MIN_TESTED_ITEMS or MIN_TESTED_WEIGHT would produce
// the same 66 lifts and is still caught, twice: by the literal floor comparison at
// the end of this file, and by the requirement that testedWeight actually grew.
const LIFTED = {
  thune: "immig_fentanyl — stated position(s) sourced to thune.senate.gov",
  cotton: "israel_support — stated position(s) sourced to cotton.senate.gov",
  mccormick: "crypto_cbdc — stated position(s) sourced to mccormick.senate.gov",
  murkowski: "energy_production — stated position(s) sourced to murkowski.senate.gov",
  crapo: "gov_regulation, tax_middle_class — stated position(s) sourced to crapo.senate.gov",
  comer: "deportations — stated position(s) sourced to oversight.house.gov",
  wicker: "veterans, israel_support — stated position(s) sourced to wicker.senate.gov",
  guthrie: "immig_fentanyl, healthcare_costs — stated position(s) sourced to guthrie.house.gov, energycommerce.house.gov",
  capito: "permitting_reform — stated position(s) sourced to capito.senate.gov",
  banks: "deportations — stated position(s) sourced to banks.senate.gov",
  tommy_tuberville: "israel_support — stated position(s) sourced to tuberville.senate.gov",
  jim_justice: "lands_energy — stated position(s) sourced to justice.senate.gov",
  ricketts: "israel_support — stated position(s) sourced to ricketts.senate.gov",
  hoeven: "lands_energy — stated position(s) sourced to hoeven.senate.gov",
  andy_harris: "national_debt — stated position(s) sourced to harris.house.gov",
  mullin: "deportations — stated position(s) sourced to mullin.senate.gov",
  schmitt: "deportations — stated position(s) sourced to schmitt.senate.gov",
  fitzpatrick: "gun_safety — stated position(s) sourced to fitzpatrick.house.gov",
  rick_scott: "gov_waste — stated position(s) sourced to rickscott.senate.gov",
  boozman: "veterans — stated position(s) sourced to boozman.senate.gov",
  ron_johnson: "gov_waste — stated position(s) sourced to ronjohnson.senate.gov",
  tillis: "immig_fentanyl, health_mental — stated position(s) sourced to tillis.senate.gov",
  cassidy: "healthcare_costs — stated position(s) sourced to cassidy.senate.gov",
  maloy: "enviro_energy — stated position(s) sourced to utahnewsdispatch.com",
  mike_rounds: "veterans — stated position(s) sourced to rounds.senate.gov",
  mike_waltz: "veterans — stated position(s) sourced to waltz.house.gov",
  schumer: "gun_safety, healthcare_costs, lgbtq_rights — stated position(s) sourced to democrats.senate.gov",
  meeks: "gun_safety — stated position(s) sourced to meeks.house.gov",
  coons: "israel_support — stated position(s) sourced to coons.senate.gov",
  murray: "child_care — stated position(s) sourced to murray.senate.gov",
  heinrich: "gun_safety, climate_action — stated position(s) sourced to heinrich.senate.gov",
  tom_suozzi: "border_security — stated position(s) sourced to suozzi.house.gov",
  delia_ramirez: "housing_build, healthcare_costs, deportations — stated position(s) sourced to ramirez.house.gov",
  sarah_mcbride: "family_support, healthcare_costs — stated position(s) sourced to mcbride.house.gov",
  ayanna_pressley: "housing_build — stated position(s) sourced to pressley.house.gov",
  jake_auchincloss: "healthcare_costs — stated position(s) sourced to auchincloss.house.gov",
  greg_landsman: "family_support — stated position(s) sourced to landsman.house.gov",
  raja_krishnamoorthi: "gun_safety — stated position(s) sourced to democrats-selectcommitteeontheccp.house.gov",
  jon_ossoff: "healthcare_costs — stated position(s) sourced to ossoff.senate.gov",
  diana_degette: "climate_action — stated position(s) sourced to degette.house.gov",
  gaetz: "restraint, america_first_fp — stated position(s) sourced to gaetz.house.gov",
  gillibrand: "family_support — stated position(s) sourced to gillibrand.senate.gov",
  maggie_hassan: "healthcare_costs — stated position(s) sourced to hassan.senate.gov",
  bennet: "family_support — stated position(s) sourced to bennet.senate.gov",
  jim_himes: "gun_safety — stated position(s) sourced to himes.house.gov",
  neguse: "disaster_resilience — stated position(s) sourced to neguse.house.gov",
  hickenlooper: "climate_action — stated position(s) sourced to hickenlooper.senate.gov",
  hirono: "deportations — stated position(s) sourced to hirono.senate.gov",
  merkley: "privacy_rights, gov_transparency — stated position(s) sourced to merkley.senate.gov",
  tina_smith: "healthcare_costs — stated position(s) sourced to smith.senate.gov",
  ted_lieu: "gun_safety — stated position(s) sourced to lieu.house.gov",
  angus_king: "climate_action — stated position(s) sourced to king.senate.gov",
  schatz: "climate_action — stated position(s) sourced to schatz.senate.gov",
  aguilar: "housing_build, healthcare_costs — stated position(s) sourced to aguilar.house.gov",
  van_hollen: "healthcare_costs — stated position(s) sourced to vanhollen.senate.gov",
  padilla: "deportations — stated position(s) sourced to padilla.senate.gov",
  cortez_masto: "healthcare_costs, disaster_resilience — stated position(s) sourced to cortezmasto.senate.gov",
  delauro: "healthcare_costs — stated position(s) sourced to delauro.house.gov",
  neal: "family_support — stated position(s) sourced to neal.house.gov",
  walberg: "israel_support — stated position(s) sourced to walberg.house.gov",
  gallego: "health_mental — stated position(s) sourced to gallego.senate.gov",
  jerry_moran: "immig_fentanyl — stated position(s) sourced to moran.senate.gov",
  andy_kim: "gun_safety — stated position(s) sourced to kim.house.gov",
  lujan: "climate_action — stated position(s) sourced to lujan.senate.gov",
  fetterman: "deportations — stated position(s) sourced to fetterman.senate.gov",
  robert_garcia: "climate_action — stated position(s) sourced to robertgarcia.house.gov",
};

// ── One mapped item withdrawn, because it was never an act ───────────────────
// The third movement this file has to reason about, and the most dangerous one:
// a mapped formal item REMOVED. A removal that lowers a score is the drift this
// harness exists to catch, so the licence below is the narrowest of the three and
// it is spent on a single (person, key) pair.
//
// September 2026 word-first gate pass — the issue map's curated backfill was
// keying one of Phil Lyman's spotlight items, "carried his public lands fight
// from protest into the statehouse", to lands_local. That item is a pattern
// summary drawn from a biography: no measure, no ballot, no date, no clerk. It is
// exactly the class the map's own documented rule excludes, and while it was
// mapped it did two things — it printed "1 issue on the formal record" over a file
// with no formal record, and it made lands_local read as a TESTED row with a
// Direction match of 100% and a verdict of "consistent" for someone who has never
// cast a vote. A 100% agreement between a stated position and a biography
// sentence is the invented finding this codebase refuses everywhere else.
//
// So a withdrawal is allowed to move exactly what an un-invented finding leaves
// behind, and nothing else. It may NEVER touch a published figure: the profile had
// to be unpublishable before and must still be unpublishable now, so no reader
// ever saw the number this removes. The scorable pool may not shrink and the word
// count may not move — a position was not deleted, it stopped being tested — so
// what falls out of `tested` must land in `untested`. And the removal has to be
// visible in the source rather than asserted: the backfill line is gone from
// consistency.js, and the formal pattern index reports zero rows for the person.
const WITHDRAWN = {
  lyman: {
    key: "lands_local",
    why: "the lands_local backfill was a biography pattern summary, not an act",
  },
};

let published = 0, thinPerfect = 0, curated = 0, lifted = 0, withdrawn = 0;
for (const pid of PIDS) {
  if (declaredStanceMovesAtHead().moved.has(pid)) continue; // a declared stance pass (v103-chrome-seams.mjs)
  const p = before.CMP_DATA[pid];
  let a = null, b = null;
  try { a = before.PDXWordAction.read(pid, p); } catch (e) { a = { __err: String(e) }; }
  try { b = after.PDXWordAction.read(pid, after.CMP_DATA[pid]); } catch (e) { b = { __err: String(e) }; }

  ok(!!a === !!b, `${pid}: both engines return a read (or neither does)`);
  if (!a || !b) continue;
  eq(b.__err, a.__err, `${pid}: the read did not start or stop throwing`);

  const ca = a.coverage || {}, cb = b.coverage || {};
  if (LIFTED[pid]) {
    // These profiles gained POSITIONS, not scores. This harness deliberately boots
    // without seeding a voting record, so nothing here is tested on either side and
    // the published arithmetic must sit exactly where it did — the lift itself was
    // measured against seeded records elsewhere. What is proved here instead is the
    // thing the lift is supposed to rest on: the named issue keys carried NO stated
    // position before and carry one now. A floor quietly lowered would move scores
    // without adding any of these keys, and would fail on the first line below.
    for (const k of READ_KEYS) {
      eq(JSON.stringify(b[k]), JSON.stringify(a[k]),
        `${pid}: lifted (${LIFTED[pid]}) — read().${k} is unchanged; a position is not a score`);
    }
    const pmA = before._polPositionMap(pid, p) || {};
    const pmB = after._polPositionMap(pid, after.CMP_DATA[pid]) || {};
    for (const k of LIFTED[pid].split(" — ")[0].split(", ")) {
      // This used to also assert `!pmA[k]` — that the key held no stated position in
      // the baseline tree. That is true exactly once, while the lift is still
      // uncommitted. The moment the pass lands, HEAD *is* the after-state, pmA and
      // pmB become the same map, and the assertion inverts: the file reports one
      // failure per lifted key describing nothing that is wrong. It is not
      // recoverable by picking an older baseline either, because the baseline is
      // deliberately HEAD and this file never reaches into .git.
      //
      // So the witness changes with the tree. Before the lift is committed, pmB
      // gaining the key is the evidence. After, what remains testable — and what an
      // accidental revert or a quietly narrowed sourcing rule would still break — is
      // that the key is STILL carrying a stated position in the tree under test.
      // The claim the block exists to make, that a position is not a score, is
      // unaffected: READ_KEYS above holds every published figure identical across
      // both trees, so a floor lowered to manufacture one of these would fail there.
      ok(!!pmB[k], `${pid}: lifted (${LIFTED[pid]}) — ${k} no longer holds a stated position`);
      ok(!pmA[k] || !!pmB[k],
        `${pid}: lifted — ${k} held a stated position in the baseline and lost it in this tree`);
    }
    ok((cb.word - cb.recordDerived) >= (ca.word - ca.recordDerived),
      `${pid}: lifted (${LIFTED[pid]}) — positions standing on their own evidence did not fall away`);
    ok(cb.recordDerived <= ca.recordDerived, `${pid}: lifted (${LIFTED[pid]}) — no position became record-derived`);
    ok(cb.scorable >= ca.scorable, `${pid}: lifted (${LIFTED[pid]}) — the scorable pool did not shrink`);
    eq(cb.warming, ca.warming, `${pid}: lifted (${LIFTED[pid]}) — warming state is unchanged`);
    lifted++;
    continue;
  }
  if (WITHDRAWN[pid]) {
    const w = WITHDRAWN[pid];
    ok(!a.publishable, `${pid}: withdrawn (${w.why}) — the figure it removes was never published`);
    ok(!b.publishable, `${pid}: withdrawn — nothing became publishable`);
    ok((b.testedWeight || 0) <= (a.testedWeight || 0),
      `${pid}: withdrawn — tested weight rose, so this was not a removal`);
    eq(b.word, a.word, `${pid}: withdrawn — no stated position was deleted with the mapping`);
    eq(cb.word, ca.word, `${pid}: withdrawn — coverage.word is unchanged`);
    eq(cb.scorable, ca.scorable, `${pid}: withdrawn — the scorable pool is unchanged`);
    eq(cb.recordDerived, ca.recordDerived, `${pid}: withdrawn — no position became record-derived`);
    eq(cb.warming, ca.warming, `${pid}: withdrawn — warming state is unchanged`);
    ok(cb.tested <= ca.tested, `${pid}: withdrawn — the tested count rose`);
    eq(cb.tested + cb.untested, ca.tested + ca.untested,
      `${pid}: withdrawn — an issue left the file instead of moving from tested to untested`);
    // The two witnesses in the source, so a quiet re-map cannot pass as a fix.
    const csNoComments = nowSrc("consistency.js").replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
    ok(csNoComments.indexOf("lyman||carried his public lands fight") === -1,
      `${pid}: withdrawn — the backfill line is still live in consistency.js`);
    const shp = after.PDXConsistency.formalPatternIndex.shape(pid) || {};
    eq(shp.issues, 0, `${pid}: withdrawn — the formal pattern index still holds a row`);
    withdrawn++;
    continue;
  }
  for (const k of READ_KEYS) {
    eq(JSON.stringify(b[k]), JSON.stringify(a[k]), `${pid}: read().${k} is unchanged`);
  }
  if (CURATED[pid]) {
    // Coverage may move — the score may not, and it is held above with READ_KEYS.
    // What is checked instead is that the movement is depth: the pool of positions
    // this profile can be tested on never shrank.
    // Not `word` on its own: re-sourcing a vote-derived sentence can retire a
    // branding placeholder the engine only emitted because the key had no real
    // position, which drops the raw count while improving the record. The
    // invariant that holds is the one that matters — the number of positions
    // standing on their OWN evidence never falls.
    ok((cb.word - cb.recordDerived) >= (ca.word - ca.recordDerived),
      `${pid}: curated (${CURATED[pid]}) — independently-sourced positions did not fall away`);
    ok(cb.scorable >= ca.scorable, `${pid}: curated (${CURATED[pid]}) — the scorable pool did not shrink`);
    ok(cb.recordDerived <= ca.recordDerived, `${pid}: curated (${CURATED[pid]}) — no position became record-derived`);
    eq(cb.warming, ca.warming, `${pid}: curated (${CURATED[pid]}) — warming state is unchanged`);
    curated++;
  } else {
    for (const k of COV_KEYS) {
      eq(cb[k], ca[k], `${pid}: coverage.${k} is unchanged`);
    }
  }

  if (a.publishable && typeof a.pct === "number") {
    published++;
    // THE CASE THE PASS EXISTS FOR must still be published. Raising a floor to
    // stop printing thin perfect scores is the tempting fix and the forbidden one.
    if (a.pct >= 90 && ca.tested <= 6) {
      thinPerfect++;
      ok(b.publishable === true,
        `${pid} publishes ${a.pct}% on ${ca.tested} tested issues and still does — ` +
        `the pass discloses thin scores, it does not suppress them`);
      eq(b.pct, a.pct, `${pid}: …at the same figure, unrounded and unmoved`);
    }
  } else {
    // And nothing became publishable either. Depth is not a licence to lower a bar.
    ok(!b.publishable || !a.publishable === !b.publishable,
      `${pid}: an unpublishable read did not become publishable`);
  }
}
console.log(`      (published figures compared: ${published}; of them thin-and-near-perfect: ${thinPerfect}; ` +
  `curated this pass: ${curated}; lifted over the floor: ${lifted})`);
eq(curated, Object.keys(CURATED).length,
  "every profile on the curated list was actually reached — a stale name would hide a real freeze");
eq(lifted, Object.keys(LIFTED).length,
  "every profile on the lifted list was actually reached — a stale name would hide a real freeze");
eq(withdrawn, Object.keys(WITHDRAWN).length,
  "every profile on the withdrawn list was actually reached — a stale name would hide a real removal");
ok(published > 0, "there were published figures to compare");
ok(thinPerfect > 0, "…including the thin, near-perfect ones this pass is about");

// ═════════════════════════════════════════════════════════════════════════════
section("scopedRead() — the current-term slice reads the same too");
// ═════════════════════════════════════════════════════════════════════════════
let scoped = 0;
for (const pid of PIDS) {
  if (declaredStanceMovesAtHead().moved.has(pid)) continue; // a declared stance pass (v103-chrome-seams.mjs)
  let a = null, b = null;
  try { a = before.PDXWordAction.scopedRead(pid, before.CMP_DATA[pid]); } catch (e) { continue; }
  try { b = after.PDXWordAction.scopedRead(pid, after.CMP_DATA[pid]); } catch (e) { b = null; }
  if (!a) continue;
  ok(!!b, `${pid}: the scoped read still returns`);
  if (!b) continue;
  scoped++;
  eq(b.applicable, a.applicable, `${pid}: scope applicability is unchanged`);
  eq(JSON.stringify(b.scope), JSON.stringify(a.scope), `${pid}: the scope itself is unchanged`);
  eq(JSON.stringify(b.delta), JSON.stringify(a.delta), `${pid}: the all-time/term delta is unchanged`);
  for (const slice of ["main", "current"]) {
    const sa = a[slice], sb = b[slice];
    ok(!!sa === !!sb, `${pid}: the ${slice} slice is present in both`);
    if (!sa || !sb) continue;
    if (LIFTED[pid]) {
      // Same licence as above, one slice down: a slice may start publishing, and
      // may never stop or restate a figure it was already showing.
      ok(!(sa.publishable && !sb.publishable), `${pid}: lifted — the ${slice} slice did not stop publishing`);
      if (sa.publishable) eq(sb.pct, sa.pct, `${pid}: lifted — ${slice}.pct is unchanged where it already published`);
      ok(sb.coverage.tested >= sa.coverage.tested, `${pid}: lifted — ${slice} tested count did not fall`);
      ok(sb.coverage.scorable >= sa.coverage.scorable, `${pid}: lifted — ${slice} scorable pool did not shrink`);
      continue;
    }
    eq(sb.pct, sa.pct, `${pid}: ${slice}.pct is unchanged`);
    eq(sb.publishable, sa.publishable, `${pid}: ${slice}.publishable is unchanged`);
    if (WITHDRAWN[pid]) {
      // The slice may lose the withdrawn test and may not lose a position: the
      // figure it published is held identical two lines up, on both slices.
      ok(sb.coverage.tested <= sa.coverage.tested,
        `${pid}: withdrawn — the ${slice} tested count rose`);
      eq(sb.coverage.scorable, sa.coverage.scorable,
        `${pid}: withdrawn — the ${slice} scorable pool is unchanged`);
    } else if (CURATED[pid]) {
      ok(sb.coverage.tested >= sa.coverage.tested, `${pid}: ${slice} tested count did not fall`);
      ok(sb.coverage.scorable >= sa.coverage.scorable, `${pid}: ${slice} scorable pool did not shrink`);
    } else {
      eq(sb.coverage.tested, sa.coverage.tested, `${pid}: ${slice} tested count is unchanged`);
      eq(sb.coverage.scorable, sa.coverage.scorable, `${pid}: ${slice} scorable pool is unchanged`);
    }
  }
}
console.log(`      (scoped reads compared: ${scoped})`);

// ═════════════════════════════════════════════════════════════════════════════
section("rowResult() — every issue row, one at a time");
// ═════════════════════════════════════════════════════════════════════════════
// The per-issue figures the marker sits beside. If adding a chip changed a row's
// state, metric or percentage, the marker would be editing the finding.
let rows = 0, tested = 0;
for (const pid of PIDS) {
  if (declaredStanceMovesAtHead().moved.has(pid)) continue; // a declared stance pass (v103-chrome-seams.mjs)
  let ra = [], rb = [];
  try { ra = before.PDXConsistency.issueRows(pid) || []; } catch (e) { continue; }
  try { rb = after.PDXConsistency.issueRows(pid) || []; } catch (e) { rb = []; }
  const keysA = ra.map((r) => r.key), keysB = rb.map((r) => r.key);
  if (CURATED[pid] || LIFTED[pid]) {
    // Same rows, same relative order, additions only. A row that vanished or was
    // reordered against another still fails — this is a superset check, not a
    // waiver. It is a subsequence rather than a prefix because a newly stated
    // position sorts in with the other stated positions, ahead of the keys the
    // record alone contributes, so an addition legitimately lands mid-list.
    const label = LIFTED[pid] ? "lifted" : "curated";
    ok(keysB.length >= keysA.length, `${pid}: ${label} — the row list did not shrink`);
    let at = 0;
    for (const k of keysA) { const i = keysB.indexOf(k, at); if (i < 0) { at = -1; break; } at = i + 1; }
    ok(at >= 0, `${pid}: ${label} — every pre-existing row is still there, in the same order`);
  } else {
    eq(rb.length, ra.length, `${pid}: the same number of issue rows`);
    eq(keysB.join("|"), keysA.join("|"), `${pid}: the same issue rows, in the same order`);
  }
  const byKey = {};
  for (const r of rb) byKey[r.key] = r;
  for (const r of ra) {
    const q = byKey[r.key];
    if (!q) continue;
    rows++;
    let sa = null, sb = null;
    try { sa = before.PDXConsistency.rowResult(r); } catch (e) { sa = { __err: 1 }; }
    try { sb = after.PDXConsistency.rowResult(q); } catch (e) { sb = { __err: 1 }; }
    eq(!!sb, !!sa, `${pid}/${r.key}: both engines resolve the row`);
    if (!sa || !sb) continue;
    if (LIFTED[pid] && sa.state !== "tested") {
      // The row the new position was written for: it may only ever gain a test.
      // A row that was tested before is held to the full comparison below.
      ok(sb.state === "tested" || sb.state === sa.state,
        `${pid}/${r.key}: lifted — the row either gained a test or stayed as it was (${sa.state} → ${sb.state})`);
      if (sa.state === sb.state) eq(sb.pct, sa.pct, `${pid}/${r.key}: lifted — an untouched row kept its percentage`);
      if (sa.state === sb.state) eq((q.verdict || {}).token, (r.verdict || {}).token, `${pid}/${r.key}: lifted — an untouched row kept its verdict`);
      continue;
    }
    if (WITHDRAWN[pid] && r.key === WITHDRAWN[pid].key) {
      // The one row the withdrawal is spent on: it held a Direction match with no
      // act under it, and it must now read as an untested row with no figure, no
      // metric and no lane — not as a different finding.
      //
      // THE WITNESS CHANGES WITH THE TREE, for the reason the lifted block above
      // spells out at length. `sa.state === "tested"` is the evidence that
      // something was withdrawn, and it is true exactly once: while the removal is
      // still uncommitted. The moment the pass lands, HEAD *is* the after-state,
      // the baseline reads the same untested row, and an assertion demanding a
      // tested baseline reports one failure describing nothing that is wrong —
      // which is what it did. What stays testable in either tree is that this row
      // is untested here and that the baseline is not some THIRD state: a row that
      // came back as tested, or drifted into a different finding, still fails.
      ok(sa.state === "tested" || sa.state === sb.state,
        `${pid}/${r.key}: withdrawn — the baseline row is neither the tested row that was withdrawn ` +
        `nor the untested row this tree prints (${sa.state} → ${sb.state})`);
      eq(sb.state, "untested", `${pid}/${r.key}: withdrawn — the row is still tested`);
      eq(sb.pct, null, `${pid}/${r.key}: withdrawn — the row still carries a percentage`);
      ok(!sb.metric, `${pid}/${r.key}: withdrawn — the row still names a metric`);
      eq((q.verdict || {}).token, "pending", `${pid}/${r.key}: withdrawn — the row still carries a verdict`);
      ok(!(q.verdict || {}).basis, `${pid}/${r.key}: withdrawn — the row is still decided in a lane`);
      continue;
    }
    eq(sb.state, sa.state, `${pid}/${r.key}: row state is unchanged`);
    eq(sb.metric, sa.metric, `${pid}/${r.key}: row metric is unchanged`);
    eq(sb.pct, sa.pct, `${pid}/${r.key}: row percentage is unchanged`);
    eq((q.verdict || {}).token, (r.verdict || {}).token,
      `${pid}/${r.key}: the verdict is unchanged — the marker is depth, not an outcome`);
    eq((q.verdict || {}).basis, (r.verdict || {}).basis,
      `${pid}/${r.key}: …and it is still decided in the same lane`);
    if (sa.state === "tested") tested++;
  }
}
console.log(`      (issue rows compared: ${rows}; tested among them: ${tested})`);
ok(rows > 500, "the row sweep was wide enough to mean something");
ok(tested > 0, "…and included tested rows");

// ═════════════════════════════════════════════════════════════════════════════
section("the floors themselves");
// ═════════════════════════════════════════════════════════════════════════════
// Belt and braces: the constants are legible in the source, so read them from both
// trees and compare the literals. A floor could in principle move without changing
// any current profile's outcome, and that would still be a floor moving.
const grab = (src, name) => {
  const m = src.match(new RegExp("\\b" + name + "\\s*=\\s*([0-9]+)"));
  return m ? m[1] : null;
};
for (const name of ["MIN_TESTED_ITEMS", "MIN_TESTED_WEIGHT", "EVIDENCE_CAP"]) {
  const a = grab(headSrc("word-action.js") || "", name);
  const b = grab(nowSrc("word-action.js"), name);
  ok(a !== null, `${name} is findable in the pre-pass source`);
  eq(b, a, `${name} is the same integer it was`);
}

console.log("");
if (failures.length) {
  console.error(`✗ score drift: ${failures.length} failure(s), ${passed} passed\n`);
  failures.slice(0, 40).forEach((f) => console.error(`   · ${f}`));
  if (failures.length > 40) console.error(`   · …and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`✓ score drift: none — the pass changed what is said, not what is scored — ${passed} assertions passed\n`);
