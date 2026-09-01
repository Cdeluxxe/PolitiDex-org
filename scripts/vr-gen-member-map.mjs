#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — regenerate the bioguide → roster-slug member map
// ─────────────────────────────────────────────────────────────────────────────
// The Phase-7 ingest (netlify/lib/vr-ingest.ts) attributes a Congress.gov roll-call
// vote to a roster figure ONLY when the voter's Bioguide ID resolves through this
// map — an unmapped member is skipped and counted, never guessed, because a wrong
// attribution is worse than a gap.
//
// This script rebuilds db/vr-member-map.json from two authoritative, in-repo
// sources plus (optionally) the public legislators dataset for annotation:
//
//   1. BROWSE_PHOTOS in index.html — every sitting member of Congress the app
//      profiles carries a curated, HTTP-200-verified portrait whose URL embeds the
//      member's Bioguide ID:
//        raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/<BIOGUIDE>.jpg
//      So slug → Bioguide is read straight out of that URL — no name-matching guess.
//
//   2. SEED_SLUGS below — the handful of federal roster figures whose profile photo
//      comes from Firestore rather than BROWSE_PHOTOS (so their Bioguide isn't in an
//      image URL). Each was confirmed by name+state against the authoritative dataset
//      at https://unitedstates.github.io/congress-legislators/legislators-current.json
//      These are the same slugs the curated seed migration uses.
//
// ── Admission is scoped, and that scoping is the point ────────────────────────
// Those two sources answer "whose Bioguide can we read?", which is a much larger set
// than "whom is the ingest scoped to attribute". There are currently 173 curated
// congressional portraits and the roster is 101. For a long time the difference was
// invisible drift: portraits kept being added, this script was not re-run, and the
// committed map silently fell 101 members behind its own generator — which is exactly
// why 37 members with stated positions could never receive a vote no matter how many
// roll calls were ingested.
//
// So the roster ceiling is now stated explicitly in db/vr-roster-admitted.json and
// enforced here in both directions:
//   • a slug admitted there but resolving to no Bioguide is a hard error, caught at
//     generation instead of surfacing later as a member who silently gets no votes;
//   • a portrait not admitted there is reported as unadmitted and attributes nothing.
// Widening the roster is then a reviewable one-line-per-member diff in that file, and
// never an accident of photo curation.
//
// ── And the portrait itself is cross-checked against the name the app publishes ──
// Reading the Bioguide out of a portrait URL removes the name-matching guess, but it
// makes the map exactly as right as the photo. See checkNamesAgree() below for the
// failure that motivates it.
//
// Annotation (name/chamber/state/party, "serving in the 119th") is best-effort: if
// legislators-current.json is present next to this script or fetchable, members[] is
// enriched for human review. The map itself never depends on it. A mapped member who
// is NOT in the current dataset — a former member whose votes are still in the window,
// like Michael Waltz — is looked up in legislators-historical.json so the review block
// shows a name rather than a row of nulls.
//
//   node scripts/vr-gen-member-map.mjs           # rebuild db/vr-member-map.json
//   node scripts/vr-gen-member-map.mjs --check   # verify on-disk file is up to date
//
// After regenerating, an operator may push the map into the vr-config Blobs store
// with scripts/vr-load-member-map.mjs to override the committed fallback at runtime.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "db", "vr-member-map.json");
const ADMITTED = join(ROOT, "db", "vr-roster-admitted.json");
const LEG_LOCAL = join(dirname(fileURLToPath(import.meta.url)), "legislators-current.json");
const LEG_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json";
const LEG_HIST_LOCAL = join(dirname(fileURLToPath(import.meta.url)), "legislators-historical.json");
const LEG_HIST_URL = "https://unitedstates.github.io/congress-legislators/legislators-historical.json";

// Federal roster figures whose portrait is NOT a congress-images URL (Firestore
// photo), so their Bioguide can't be read from BROWSE_PHOTOS. Verified by name+state
// against legislators-current.json. Keep this list in sync when such a figure is added.
const SEED_SLUGS = {
  julie_fedorchak: "F000482", // Julie Fedorchak — Rep, ND-AL
  troy_downing: "D000634",    // Troy Downing — Rep, MT-02
  mike_simpson: "S001148",    // Michael K. Simpson — Rep, ID-02
  mike_flood: "F000474",      // Mike Flood — Rep, NE-01

  // ── The people who run the committees ──────────────────────────────────────
  // The twenty-four House chairs, ranking members and elected leaders the app
  // profiles were all missing from this map, because BROWSE_PHOTOS is a curated
  // shelf rather than a census and the committee gavels were never anyone's turn
  // to add. Twenty-two of them now carry an official congressional portrait there
  // and resolve the ordinary way. These two do not — maloy's curated photo is a
  // bioguide.congress.gov file and neguse's is a Commons upload, so neither URL
  // carries a readable Bioguide and both need naming here.
  maloy: "M001228",           // Celeste Maloy — Rep, UT-02
  neguse: "N000191",          // Joe Neguse — Rep, CO-02
  lujan: "L000570",           // Ben Ray Luján — Sen, NM (Commons portrait, no readable Bioguide)

  // ── The eight thin House files ─────────────────────────────────────────────
  // Federal wave F6 named these eight as the whole thin band of the House set:
  // five or six issues, two acts each, both acts on the same pair of Congressional
  // Review Act resolutions, and ten acts short of the member floor. Every roll in
  // the 119th that could have moved them was unattributable, because none of the
  // eight was in this map — they were SPOTLIGHTS figures with no BROWSE_PHOTOS
  // portrait, so there was no URL to read a Bioguide out of and nobody had named
  // them by hand. That is an attribution gap, not a vocabulary one, and it is the
  // reason a mapping-only wave could not reach them.
  //   The same wave gave all eight a portrait in BROWSE_PHOTOS, because a member who
  // attributes votes can be the subject of an Official Record share card and that card
  // must not open on initials. These entries stay anyway: they are the record of the
  // by-hand verification, and they keep attribution from depending on a curated photo
  // URL. buildMap() now errors if the two sources ever name different people.
  // Each Bioguide below was read from the clerk.house.gov roll XML `name-id`
  // attribute and then verified twice: against legislators-current.json by
  // name+state, and independently by unique surname+state on the same roll (the
  // clerk disambiguates the colliding surnames as "Smith (NE)", "Lee (NV)" and
  // "Nunn (IA)", which is what the second path matches). The state on each line
  // agrees with the district comment on the slug in politician-stances.js.
  adrian_smith: "S001172",           // Adrian Smith — Rep, NE-03
  dina_titus: "T000468",             // Dina Titus — Rep, NV-01
  gabe_vasquez: "V000136",           // Gabe Vasquez — Rep, NM-02
  melanie_stansbury: "S001218",      // Melanie A. Stansbury — Rep, NM-01
  russ_fulcher: "F000469",           // Russ Fulcher — Rep, ID-01
  susie_lee: "L000590",              // Susie Lee — Rep, NV-03
  teresa_leger_fernandez: "L000273",  // Teresa Leger Fernandez — Rep, NM-03
  zach_nunn: "N000193",              // Zachary Nunn — Rep, IA-03

  // ── The three senators no Senate roll could reach ──────────────────────────
  // Federal wave F7 ingested a Senate slice and recorded, rather than fixed, a
  // roster gap: three serving senators were absent from this map, so every Senate
  // roll in the corpus lost the same three rows — 37 unattributable rows per roll
  // once the alumni and the vacancies are counted. F8 admits them.
  //   Each Bioguide below was verified TWICE, and by two independent paths:
  //   1. name + state against legislators-current.json, which gives the Bioguide;
  //   2. the `<lis_member_id>` the Senate's own LIS roll XML records for that
  //      senator, matched against `id.lis` in the same dataset — S438, S395 and
  //      S440 respectively. Path 2 is the one that matters here, because the
  //      Senate resolver keys on (surname, state) off the roll XML and not on a
  //      Bioguide, so the LIS id is what actually connects a slug to a vote.
  //   The bioguides also agree with the ones waves F2 and F3 wrote into their own
  // `unmappedBioguide` arrays when they counted these three as losses.
  //   hyde_smith additionally carries a congress-images portrait, so BROWSE_PHOTOS
  // and this list name her independently and buildMap() cross-checks them. The
  // other two have Commons portraits with no readable Bioguide, which is why their
  // identity is cross-checked through SEED_NAMES below instead.
  jon_husted: "H001104",             // Jon Husted — Sen, OH (LIS S438; appointed 2025-01-21)
  hyde_smith: "H001079",             // Cindy Hyde-Smith — Sen, MS (LIS S395)
  alan_armstrong: "A000383",         // Alan Armstrong — Sen, OK (LIS S440; sworn 2026-03-24)

  // ── Federal roster wave R1: the whole sitting House ───────────────────────
  // Wave F9 recorded 2,245 judged House votes it could not place, and it was not the
  // only one: across the twenty-three House rolls the F6/F7/F9 seeds put on disk,
  // 7,298 recorded positions had nowhere to go — about 315 on every single roll. The
  // Clerk had published all of them. The map had 116 of the 431 sitting members in it,
  // so the other 315 were skipped and counted, which is the right thing to do with a
  // Bioguide you cannot resolve and a terrible thing to leave standing for a year.
  //   R1 admits all 315. Every Bioguide below was verified against three documents
  // that are able to disagree — clerk.house.gov's own MemberData.xml roster, the
  // congress-legislators dataset, and the name-id attribute in the roll XML itself —
  // and the per-person ledger, including the seventeen written refusals, is in
  // db/vr-federal-roster-r1-census.json. Regenerate it with
  // scripts/vr-federal-roster-r1-census.mjs; scripts/test-vr-federal-roster-r1.mjs
  // holds this list and that file to each other.
  //   305 of them also carry a congress-images portrait in BROWSE_PHOTOS, so their
  // slug is claimed by two independent sources and buildMap() fails if the two ever
  // name different people. That redundancy is the whole point of listing them here
  // rather than letting the portrait URL be the only thing that knows: a repointed
  // photo silently re-homes a voting record, and this is the second opinion. The other
  // ten have no file in unitedstates/images and use their official bioguide.congress.gov
  // portrait, whose URL fromBrowsePhotos() also reads — so all 315 are cross-checked,
  // none of them on one source's word.
  //   Ordered by state and district, the way the Clerk's roster reads, so a missing
  // seat is visible as a gap rather than hidden in an alphabet.
  nicholas_begich:           "B001323", // Nicholas J. Begich III — R-AK-AL · bioguide.congress.gov portrait
  barry_moore:               "M001212", // Barry Moore — R-AL-01
  shomari_figures:           "F000481", // Shomari Figures — D-AL-02
  mike_rogers_al:            "R000575", // Mike Rogers — R-AL-03
  robert_aderholt:           "A000055", // Robert B. Aderholt — R-AL-04
  dale_strong:               "S001220", // Dale W. Strong — R-AL-05
  gary_palmer:               "P000609", // Gary J. Palmer — R-AL-06
  terri_sewell:              "S001185", // Terri A. Sewell — D-AL-07
  david_schweikert:          "S001183", // David Schweikert — R-AZ-01
  eli_crane:                 "C001132", // Elijah Crane — R-AZ-02
  yassamin_ansari:           "A000381", // Yassamin Ansari — D-AZ-03
  greg_stanton:              "S001211", // Greg Stanton — D-AZ-04
  andy_biggs:                "B001302", // Andy Biggs — R-AZ-05
  juan_ciscomani:            "C001133", // Juan Ciscomani — R-AZ-06
  adelita_grijalva:          "G000606", // Adelita S. Grijalva — D-AZ-07 · bioguide.congress.gov portrait
  abraham_hamadeh:           "H001098", // Abraham J. Hamadeh — R-AZ-08
  paul_gosar:                "G000565", // Paul A. Gosar — R-AZ-09
  james_gallagher:           "G000607", // James Gallagher — R-CA-01 · bioguide.congress.gov portrait
  kevin_kiley:               "K000401", // Kevin Kiley — I-CA-03
  mike_thompson:             "T000460", // Mike Thompson — D-CA-04
  tom_mcclintock:            "M001177", // Tom McClintock — R-CA-05
  ami_bera:                  "B001287", // Ami Bera — D-CA-06
  doris_matsui:              "M001163", // Doris O. Matsui — D-CA-07
  john_garamendi:            "G000559", // John Garamendi — D-CA-08
  josh_harder:               "H001090", // Josh Harder — D-CA-09
  mark_desaulnier:           "D000623", // Mark DeSaulnier — D-CA-10
  nancy_pelosi:              "P000197", // Nancy Pelosi — D-CA-11
  lateefah_simon:            "S001231", // Lateefah Simon — D-CA-12
  adam_gray:                 "G000605", // Adam Gray — D-CA-13
  kevin_mullin:              "M001225", // Kevin Mullin — D-CA-15
  sam_liccardo:              "L000607", // Sam T. Liccardo — D-CA-16
  jimmy_panetta:             "P000613", // Jimmy Panetta — D-CA-19
  vince_fong:                "F000480", // Vince Fong — R-CA-20
  jim_costa:                 "C001059", // Jim Costa — D-CA-21
  david_valadao:             "V000129", // David G. Valadao — R-CA-22
  jay_obernolte:             "O000019", // Jay Obernolte — R-CA-23
  salud_carbajal:            "C001112", // Salud O. Carbajal — D-CA-24
  raul_ruiz:                 "R000599", // Raul Ruiz — D-CA-25
  julia_brownley:            "B001285", // Julia Brownley — D-CA-26
  george_whitesides:         "W000830", // George Whitesides — D-CA-27
  judy_chu:                  "C001080", // Judy Chu — D-CA-28
  luz_rivas:                 "R000620", // Luz M. Rivas — D-CA-29
  laura_friedman:            "F000483", // Laura Friedman — D-CA-30
  gilbert_cisneros:          "C001123", // Gilbert Ray Cisneros, Jr. — D-CA-31
  brad_sherman:              "S000344", // Brad Sherman — D-CA-32
  jimmy_gomez:               "G000585", // Jimmy Gomez — D-CA-34
  norma_torres:              "T000474", // Norma J. Torres — D-CA-35
  sydney_kamlager_dove:      "K000400", // Sydney Kamlager-Dove — D-CA-37
  linda_sanchez:             "S001156", // Linda T. Sánchez — D-CA-38
  young_kim:                 "K000397", // Young Kim — R-CA-40
  ken_calvert:               "C000059", // Ken Calvert — R-CA-41
  nanette_barragan:          "B001300", // Nanette Diaz Barragán — D-CA-44
  derek_tran:                "T000491", // Derek Tran — D-CA-45
  j_correa:                  "C001110", // J. Luis Correa — D-CA-46
  dave_min:                  "M001241", // Dave Min — D-CA-47
  darrell_issa:              "I000056", // Darrell Issa — R-CA-48
  mike_levin:                "L000593", // Mike Levin — D-CA-49
  scott_peters:              "P000608", // Scott H. Peters — D-CA-50
  sara_jacobs:               "J000305", // Sara Jacobs — D-CA-51
  juan_vargas:               "V000130", // Juan Vargas — D-CA-52
  jeff_hurd:                 "H001100", // Jeff Hurd — R-CO-03
  jeff_crank:                "C001137", // Jeff Crank — R-CO-05
  jason_crow:                "C001121", // Jason Crow — D-CO-06
  brittany_pettersen:        "P000620", // Brittany Pettersen — D-CO-07
  gabe_evans:                "E000300", // Gabe Evans — R-CO-08
  john_larson:               "L000557", // John B. Larson — D-CT-01
  joe_courtney:              "C001069", // Joe Courtney — D-CT-02
  jahana_hayes:              "H001081", // Jahana Hayes — D-CT-05
  jimmy_patronis:            "P000622", // Jimmy Patronis — R-FL-01
  neal_dunn:                 "D000628", // Neal P. Dunn — R-FL-02
  kat_cammack:               "C001039", // Kat Cammack — R-FL-03
  aaron_bean:                "B001314", // Aaron Bean — R-FL-04
  john_rutherford:           "R000609", // John H. Rutherford — R-FL-05
  rfine:                     "F000484", // Randy Fine — R-FL-06
  cory_mills:                "M001216", // Cory Mills — R-FL-07
  mike_haridopolos:          "H001099", // Mike Haridopolos — R-FL-08
  darren_soto:               "S001200", // Darren Soto — D-FL-09
  daniel_webster:            "W000806", // Daniel Webster — R-FL-11
  gus_bilirakis:             "B001257", // Gus M. Bilirakis — R-FL-12
  kathy_castor:              "C001066", // Kathy Castor — D-FL-14
  laurel_lee:                "L000597", // Laurel M. Lee — R-FL-15
  vern_buchanan:             "B001260", // Vern Buchanan — R-FL-16
  w_steube:                  "S001214", // W. Gregory Steube — R-FL-17
  c_franklin:                "F000472", // Scott Franklin — R-FL-18
  lois_frankel:              "F000462", // Lois Frankel — D-FL-22
  jared_moskowitz:           "M001217", // Jared Moskowitz — D-FL-23
  frederica_wilson:          "W000808", // Frederica S. Wilson — D-FL-24
  debbie_wasserman_schultz:  "W000797", // Debbie Wasserman Schultz — D-FL-25
  mario_diaz_balart:         "D000600", // Mario Diaz-Balart — R-FL-26
  maria_salazar:             "S000168", // Maria Elvira Salazar — R-FL-27
  carlos_gimenez:            "G000593", // Carlos A. Gimenez — R-FL-28
  buddy_carter:              "C001103", // Earl L. "Buddy" Carter — R-GA-01
  sanford_bishop:            "B000490", // Sanford D. Bishop, Jr. — D-GA-02
  brian_jack:                "J000311", // Brian Jack — R-GA-03
  hank_johnson:              "J000288", // Henry C. "Hank" Johnson, Jr. — D-GA-04
  nikema_williams:           "W000788", // Nikema Williams — D-GA-05
  lucy_mcbath:               "M001208", // Lucy McBath — D-GA-06
  rich_mccormick:            "M001218", // Richard McCormick — R-GA-07
  austin_scott:              "S001189", // Austin Scott — R-GA-08
  andrew_clyde:              "C001116", // Andrew S. Clyde — R-GA-09
  barry_loudermilk:          "L000583", // Barry Loudermilk — R-GA-11
  rick_allen:                "A000372", // Rick W. Allen — R-GA-12
  clay_fuller:               "F000485", // Clay Fuller — R-GA-14 · bioguide.congress.gov portrait
  ed_case:                   "C001055", // Ed Case — D-HI-01
  jill_tokuda:               "T000487", // Jill N. Tokuda — D-HI-02
  ashley_hinson:             "H001091", // Ashley Hinson — R-IA-02
  randy_feenstra:            "F000446", // Randy Feenstra — R-IA-04
  jonathan_jackson:          "J000309", // Jonathan L. Jackson — D-IL-01
  robin_kelly:               "K000385", // Robin L. Kelly — D-IL-02
  chuy_garcia:               "G000586", // Jesús G. "Chuy" García — D-IL-04
  mike_quigley:              "Q000023", // Mike Quigley — D-IL-05
  sean_casten:               "C001117", // Sean Casten — D-IL-06
  danny_davis:               "D000096", // Danny K. Davis — D-IL-07
  brad_schneider:            "S001190", // Bradley Scott Schneider — D-IL-10
  bill_foster:               "F000454", // Bill Foster — D-IL-11
  nicole_nikki_budzinski:    "B001315", // Nikki Budzinski — D-IL-13
  lauren_underwood:          "U000040", // Lauren Underwood — D-IL-14
  mary_miller:               "M001211", // Mary E. Miller — R-IL-15
  darin_lahood:              "L000585", // Darin LaHood — R-IL-16
  eric_sorensen:             "S001225", // Eric Sorensen — D-IL-17
  frank_mrvan:               "M001214", // Frank J. Mrvan — D-IN-01
  rudy_yakym:                "Y000067", // Rudy Yakym III — R-IN-02
  marlin_stutzman:           "S001188", // Marlin A. Stutzman — R-IN-03
  james_baird:               "B001307", // James R. Baird — R-IN-04
  victoria_spartz:           "S000929", // Victoria Spartz — R-IN-05
  jefferson_shreve:          "S001229", // Jefferson Shreve — R-IN-06
  andre_carson:              "C001072", // André Carson — D-IN-07
  mark_messmer:              "M001233", // Mark B. Messmer — R-IN-08
  erin_houchin:              "H001093", // Erin Houchin — R-IN-09
  tracey_mann:               "M000871", // Tracey Mann — R-KS-01
  derek_schmidt:             "S001228", // Derek Schmidt — R-KS-02
  sharice_davids:            "D000629", // Sharice Davids — D-KS-03
  ron_estes:                 "E000298", // Ron Estes — R-KS-04
  morgan_mcgarvey:           "M001220", // Morgan McGarvey — D-KY-03
  hal_rogers:                "R000395", // Harold Rogers — R-KY-05
  andy_barr:                 "B001282", // Andy Barr — R-KY-06
  troy_carter:               "C001125", // Troy A. Carter — D-LA-02
  clay_higgins:              "H001077", // Clay Higgins — R-LA-03
  julia_letlow:              "L000595", // Julia Letlow — R-LA-05
  cleo_fields:               "F000110", // Cleo Fields — D-LA-06
  lori_trahan:               "T000482", // Lori Trahan — D-MA-03
  stephen_lynch:             "L000562", // Stephen F. Lynch — D-MA-08
  william_keating:           "K000375", // William R. Keating — D-MA-09
  johnny_olszewski:          "O000176", // Johnny Olszewski, Jr. — D-MD-02
  sarah_elfreth:             "E000301", // Sarah Elfreth — D-MD-03
  glenn_ivey:                "I000058", // Glenn Ivey — D-MD-04
  april_mcclain_delaney:     "M001232", // April McClain Delaney — D-MD-06
  kweisi_mfume:              "M000687", // Kweisi Mfume — D-MD-07
  jack_bergman:              "B001301", // Jack Bergman — R-MI-01
  john_moolenaar:            "M001194", // John R. Moolenaar — R-MI-02
  hillary_scholten:          "S001221", // Hillary J. Scholten — D-MI-03
  bill_huizenga:             "H001058", // Bill Huizenga — R-MI-04
  tom_barrett:               "B001321", // Tom Barrett — R-MI-07 · bioguide.congress.gov portrait
  kristen_mcdonald_rivet:    "M001237", // Kristen McDonald Rivet — D-MI-08
  john_james:                "J000307", // John James — R-MI-10
  shri_thanedar:             "T000488", // Shri Thanedar — D-MI-13
  brad_finstad:              "F000475", // Brad Finstad — R-MN-01
  kelly_morrison:            "M001234", // Kelly Morrison — D-MN-03
  betty_mccollum:            "M001143", // Betty McCollum — D-MN-04
  michelle_fischbach:        "F000470", // Michelle Fischbach — R-MN-07
  pete_stauber:              "S001212", // Pete Stauber — R-MN-08
  wesley_bell:               "B001324", // Wesley Bell — D-MO-01 · bioguide.congress.gov portrait
  ann_wagner:                "W000812", // Ann Wagner — R-MO-02
  robert_onder:              "O000177", // Robert F. Onder, Jr. — R-MO-03
  mark_alford:               "A000379", // Mark Alford — R-MO-04
  emanuel_cleaver:           "C001061", // Emanuel Cleaver — D-MO-05
  eric_burlison:             "B001316", // Eric Burlison — R-MO-07
  ryan_zinke:                "Z000018", // Ryan K. Zinke — R-MT-01
  deborah_ross:              "R000305", // Deborah K. Ross — D-NC-02
  gregory_murphy:            "M001210", // Gregory F. Murphy — R-NC-03
  valerie_foushee:           "F000477", // Valerie P. Foushee — D-NC-04
  addison_mcdowell:          "M001240", // Addison P. McDowell — R-NC-06
  david_rouzer:              "R000603", // David Rouzer — R-NC-07
  mark_harris:               "H001102", // Mark Harris — R-NC-08
  hudson:                    "H001067", // Richard Hudson — R-NC-09
  pat_harrigan:              "H001101", // Pat Harrigan — R-NC-10
  charles_chuck_edwards:     "E000246", // Chuck Edwards — R-NC-11
  alma_adams:                "A000370", // Alma S. Adams — D-NC-12
  brad_knott:                "K000405", // Brad Knott — R-NC-13
  tim_moore:                 "M001236", // Tim Moore — R-NC-14
  chris_pappas:              "P000614", // Chris Pappas — D-NH-01
  maggie_goodlander:         "G000604", // Maggie Goodlander — D-NH-02
  donald_norcross:           "N000188", // Donald Norcross — D-NJ-01
  jefferson_van_drew:        "V000133", // Jefferson Van Drew — R-NJ-02
  herbert_conaway:           "C001136", // Herbert C. Conaway, Jr. — D-NJ-03
  chris_smith:               "S000522", // Christopher H. Smith — R-NJ-04
  thomas_kean:               "K000398", // Thomas H. Kean, Jr. — R-NJ-07
  robert_menendez:           "M001226", // Robert Menendez — D-NJ-08
  nellie_pou:                "P000621", // Nellie Pou — D-NJ-09
  lamonica_mciver:           "M001229", // LaMonica McIver — D-NJ-10
  analilia_mejia:            "M001246", // Analilia Mejia — D-NJ-11 · bioguide.congress.gov portrait
  bonnie_watson_coleman:     "W000822", // Bonnie Watson Coleman — D-NJ-12
  mark_amodei:               "A000369", // Mark E. Amodei — R-NV-02
  steven_horsford:           "H001066", // Steven Horsford — D-NV-04
  nicolas_lalota:            "L000598", // Nick LaLota — R-NY-01
  laura_gillen:              "G000602", // Laura Gillen — D-NY-04
  grace_meng:                "M001188", // Grace Meng — D-NY-06
  nydia_velazquez:           "V000081", // Nydia M. Velázquez — D-NY-07
  yvette_clarke:             "C001067", // Yvette D. Clarke — D-NY-09
  nicole_malliotakis:        "M000317", // Nicole Malliotakis — R-NY-11
  adriano_espaillat:         "E000297", // Adriano Espaillat — D-NY-13
  george_latimer:            "L000606", // George Latimer — D-NY-16
  patrick_ryan:              "R000579", // Patrick Ryan — D-NY-18
  josh_riley:                "R000622", // Josh Riley — D-NY-19
  paul_tonko:                "T000469", // Paul Tonko — D-NY-20
  john_mannion:              "M001231", // John W. Mannion — D-NY-22
  nicholas_langworthy:       "L000600", // Nicholas A. Langworthy — R-NY-23
  claudia_tenney:            "T000478", // Claudia Tenney — R-NY-24
  joseph_morelle:            "M001206", // Joseph D. Morelle — D-NY-25
  timothy_kennedy:           "K000402", // Timothy M. Kennedy — D-NY-26
  david_taylor:              "T000490", // David J. Taylor — R-OH-02
  joyce_beatty:              "B001281", // Joyce Beatty — D-OH-03
  robert_latta:              "L000566", // Robert E. Latta — R-OH-05
  michael_rulli:             "R000619", // Michael A. Rulli — R-OH-06
  max_miller:                "M001222", // Max L. Miller — R-OH-07
  warren_davidson:           "D000626", // Warren Davidson — R-OH-08
  marcy_kaptur:              "K000009", // Marcy Kaptur — D-OH-09
  michael_turner:            "T000463", // Michael R. Turner — R-OH-10
  shontel_brown:             "B001313", // Shontel M. Brown — D-OH-11
  troy_balderson:            "B001306", // Troy Balderson — R-OH-12
  emilia_sykes:              "S001223", // Emilia Strong Sykes — D-OH-13
  david_joyce:               "J000295", // David P. Joyce — R-OH-14
  mike_carey:                "C001126", // Mike Carey — R-OH-15
  suzanne_bonamici:          "B001278", // Suzanne Bonamici — D-OR-01
  cliff_bentz:               "B000668", // Cliff Bentz — R-OR-02
  maxine_dexter:             "D000635", // Maxine Dexter — D-OR-03
  valerie_hoyle:             "H001094", // Val T. Hoyle — D-OR-04
  janelle_bynum:             "B001326", // Janelle S. Bynum — D-OR-05
  andrea_salinas:            "S001226", // Andrea Salinas — D-OR-06
  dwight_evans:              "E000296", // Dwight Evans — D-PA-03
  madeleine_dean:            "D000631", // Madeleine Dean — D-PA-04
  mary_scanlon:              "S001205", // Mary Gay Scanlon — D-PA-05
  chrissy_houlahan:          "H001085", // Chrissy Houlahan — D-PA-06
  daniel_meuser:             "M001204", // Daniel Meuser — R-PA-09
  lloyd_smucker:             "S001199", // Lloyd Smucker — R-PA-11
  john_joyce:                "J000302", // John Joyce — R-PA-13
  guy_reschenthaler:         "R000610", // Guy Reschenthaler — R-PA-14
  mike_kelly:                "K000376", // Mike Kelly — R-PA-16
  chris_deluzio:             "D000530", // Christopher R. Deluzio — D-PA-17
  gabe_amo:                  "A000380", // Gabe Amo — D-RI-01
  seth_magaziner:            "M001223", // Seth Magaziner — D-RI-02
  joe_wilson:                "W000795", // Joe Wilson — R-SC-02
  sheri_biggs:               "B001325", // Sheri Biggs — R-SC-03
  william_timmons:           "T000480", // William R. Timmons IV — R-SC-04
  ralph_norman:              "N000190", // Ralph Norman — R-SC-05
  russell_fry:               "F000478", // Russell Fry — R-SC-07
  dusty_johnson:             "J000301", // Dusty Johnson — R-SD-AL
  diana_harshbarger:         "H001086", // Diana Harshbarger — R-TN-01
  tim_burchett:              "B001309", // Tim Burchett — R-TN-02
  chuck_fleischmann:         "F000459", // Charles J. "Chuck" Fleischmann — R-TN-03
  scott_desjarlais:          "D000616", // Scott DesJarlais — R-TN-04
  andrew_ogles:              "O000175", // Andrew Ogles — R-TN-05
  john_rose:                 "R000612", // John W. Rose — R-TN-06
  matt_van_epps:             "V000139", // Matt Van Epps — R-TN-07 · bioguide.congress.gov portrait
  david_kustoff:             "K000392", // David Kustoff — R-TN-08
  steve_cohen:               "C001068", // Steve Cohen — D-TN-09
  nathaniel_moran:           "M001224", // Nathaniel Moran — R-TX-01
  keith_self:                "S001224", // Keith Self — R-TX-03
  pat_fallon:                "F000246", // Pat Fallon — R-TX-04
  lance_gooden:              "G000589", // Lance Gooden — R-TX-05
  jake_ellzey:               "E000071", // Jake Ellzey — R-TX-06
  lizzie_fletcher:           "F000468", // Lizzie Fletcher — D-TX-07
  morgan_luttrell:           "L000603", // Morgan Luttrell — R-TX-08
  al_green:                  "G000553", // Al Green — D-TX-09
  michael_mccaul:            "M001157", // Michael T. McCaul — R-TX-10
  pfluger:                   "P000048", // August Pfluger — R-TX-11
  craig_goldman:             "G000601", // Craig A. Goldman — R-TX-12
  ronny_jackson:             "J000304", // Ronny Jackson — R-TX-13
  randy_weber:               "W000814", // Randy K. Weber, Sr. — R-TX-14
  monica_de_la_cruz:         "D000594", // Monica De La Cruz — R-TX-15
  veronica_escobar:          "E000299", // Veronica Escobar — D-TX-16
  pete_sessions:             "S000250", // Pete Sessions — R-TX-17
  christian_menefee:         "M001245", // Christian D. Menefee — D-TX-18 · bioguide.congress.gov portrait
  joaquin_castro:            "C001091", // Joaquin Castro — D-TX-20
  troy_nehls:                "N000026", // Troy E. Nehls — R-TX-22
  beth_van_duyne:            "V000134", // Beth Van Duyne — R-TX-24
  brandon_gill:              "G000603", // Brandon Gill — R-TX-26
  michael_cloud:             "C001115", // Michael Cloud — R-TX-27
  henry_cuellar:             "C001063", // Henry Cuellar — D-TX-28
  sylvia_garcia:             "G000587", // Sylvia R. Garcia — D-TX-29
  john_carter:               "C001051", // John R. Carter — R-TX-31
  julie_johnson:             "J000310", // Julie Johnson — D-TX-32
  marc_veasey:               "V000131", // Marc A. Veasey — D-TX-33
  vicente_gonzalez:          "G000581", // Vicente Gonzalez — D-TX-34
  casar:                     "C001131", // Greg Casar — D-TX-35
  lloyd_doggett:             "D000399", // Lloyd Doggett — D-TX-37
  wesley_hunt:               "H001095", // Wesley Hunt — R-TX-38
  robert_wittman:            "W000804", // Robert J. Wittman — R-VA-01
  jennifer_kiggans:          "K000399", // Jennifer A. Kiggans — R-VA-02
  bobby_scott:               "S000185", // Robert C. "Bobby" Scott — D-VA-03
  jennifer_mcclellan:        "M001227", // Jennifer L. McClellan — D-VA-04
  john_mcguire:              "M001239", // John J. McGuire III — R-VA-05
  ben_cline:                 "C001118", // Ben Cline — R-VA-06
  eugene_vindman:            "V000138", // Eugene Simon Vindman — D-VA-07
  donald_beyer:              "B001292", // Donald S. Beyer, Jr. — D-VA-08
  h_griffith:                "G000568", // H. Morgan Griffith — R-VA-09
  suhas_subramanyam:         "S001230", // Suhas Subramanyam — D-VA-10
  james_walkinshaw:          "W000831", // James R. Walkinshaw — D-VA-11 · bioguide.congress.gov portrait
  becca_balint:              "B001318", // Becca Balint — D-VT-AL
  delbene:                   "D000617", // Suzan K. DelBene — D-WA-01
  dan_newhouse:              "N000189", // Dan Newhouse — R-WA-04
  michael_baumgartner:       "B001322", // Michael Baumgartner — R-WA-05
  emily_randall:             "R000621", // Emily Randall — D-WA-06
  kim_schrier:               "S001216", // Kim Schrier — D-WA-08
  marilyn_strickland:        "S001159", // Marilyn Strickland — D-WA-10
  mark_pocan:                "P000607", // Mark Pocan — D-WI-02
  derrick_van_orden:         "V000135", // Derrick Van Orden — R-WI-03
  gwen_moore:                "M001160", // Gwen Moore — D-WI-04
  scott_fitzgerald:          "F000471", // Scott Fitzgerald — R-WI-05
  glenn_grothman:            "G000576", // Glenn Grothman — R-WI-06
  thomas_tiffany:            "T000165", // Thomas P. Tiffany — R-WI-07
  tony_wied:                 "W000829", // Tony Wied — R-WI-08
  carol_miller:              "M001205", // Carol D. Miller — R-WV-01
  riley_moore:               "M001235", // Riley M. Moore — R-WV-02
  harriet_hageman:           "H001096", // Harriet M. Hageman — R-WY-AL
};

// ── The official-record name for a slug the app publishes no name for ─────────
// checkNamesAgree() below is the wall that catches a portrait pointed at the wrong
// member's Bioguide. It can only fire when it has TWO names to compare: the one the
// authoritative dataset attaches to the Bioguide, and the one the app publishes for
// the slug. For a slug the app publishes no name for, the wall used to go quiet and
// the slug landed in a soft "could not be cross-checked" list — which is exactly the
// slug most likely to be wrong, because nobody has ever seen the name next to it.
//
// The three senators F8 admits are all in that position: they carry stance rows and
// a portrait but no compare card and no spotlight row, so the app publishes no name
// for them. Rather than invent a compare-card bio to satisfy a guard — a fabricated
// score and a fabricated issue list, to check a name — the name is declared here, on
// its own, read off the same official record the Bioguide came from.
//
// This is an identity string, not a profile: name only, no office, no party, no
// score, nothing a reader ever sees. And it is not circular. The wall's job is to
// catch a Bioguide that belongs to someone else, so if `hyde_smith`'s portrait is
// ever repointed at H001104, "Cindy Hyde-Smith" will not match "Husted" and
// generation fails — which is the failure the wall exists for, and which could not
// be detected for these slugs at all before.
//
// A declaration here is NOT retired when the app starts publishing the name — it is
// promoted to a second, stricter check. Federal roster wave R2 gave all three of these
// slugs a CMP_DATA row, and the earlier rule ("app-published name wins; delete the line")
// would have quietly turned the wall OFF for exactly the three slugs it was built for:
// a published name is held only to its SURNAME, because the app publishes the name a
// reader recognises and the dataset publishes the legal one ("Mike Simpson" against
// "Michael K. Simpson" is agreement, not a mismatch). Surname-only cannot tell Alan
// Armstrong (Sen, OK) from Kelly Armstrong (Gov, ND), and this app carries both.
//
// So while a line is here, checkNamesAgree() runs BOTH compares: the declaration must
// equal the official record exactly, and the app's published name must still carry the
// record's surname. Two sources is the point, not a defect. Remove a line only when the
// slug's Bioguide is asserted by something other than a hand-typed table — a portrait URL
// that carries the Bioguide, for instance, which is the position the other nine members
// of that wave are in and the reason none of them needs a line here.
const SEED_NAMES = {
  jon_husted: "Jon Husted",
  hyde_smith: "Cindy Hyde-Smith",
  alan_armstrong: "Alan Armstrong",
};

// ── 1. slug → bioguide from BROWSE_PHOTOS congress portraits ──────────────────
// BROWSE_PHOTOS was declared in an inline <script> in index.html until the
// first-paint pass moved the large inline blocks into external files loaded from
// the same document positions; it now lives in compare-hub.js. Read the document
// TOGETHER WITH the local scripts it loads so the map is found either way — this
// must stay in step with scripts/audit-photo-coverage.mjs, which reads the same
// map the same way.
function fromBrowsePhotos() {
  const index = readFileSync(join(ROOT, "index.html"), "utf8");
  const html = [index, ...[...index.matchAll(/<script[^>]*\bsrc="\/?([^"/][^"]*\.js)"/g)]
    .map((m) => m[1])
    .filter((f, i, a) => a.indexOf(f) === i)
    .map((f) => { try { return readFileSync(join(ROOT, f), "utf8"); } catch { return ""; } })].join("\n");
  const open = html.indexOf("var BROWSE_PHOTOS = {");
  if (open === -1) throw new Error("BROWSE_PHOTOS map not found in index.html or the scripts it loads");
  const close = html.indexOf("\n    };", open);
  const body = html.slice(open, close === -1 ? undefined : close);
  // TWO curated portrait forms carry a readable Bioguide, and both are read here.
  //   1. unitedstates/images — .../450x550/<BIOGUIDE>.jpg
  //   2. the official Bioguide portrait — bioguide.congress.gov/bioguide/photo/<L>/<BIOGUIDE>.jpg
  // Form 2 was parsed by nobody until federal roster wave R1, which admitted ten sitting
  // House members who have no file in unitedstates/images at all. Their Bioguide was
  // therefore known ONLY from the SEED_SLUGS entry, which is exactly the single-source
  // position checkNamesAgree() and the disagree check below exist to avoid. The letter
  // directory is required to match the Bioguide's own first letter, so a hand-typed
  // path cannot quietly name a member from another shelf.
  const FORMS = [
    /([a-z0-9_]+):\s*'https:\/\/raw\.githubusercontent\.com\/unitedstates\/images\/gh-pages\/congress\/450x550\/([A-Z][0-9]+)\.jpg'/g,
    /([a-z0-9_]+):\s*'https:\/\/bioguide\.congress\.gov\/bioguide\/photo\/([A-Z])\/(\2[0-9]+)\.jpg'/g,
  ];
  const out = {};
  for (const re of FORMS) {
    let m;
    while ((m = re.exec(body))) out[m[1]] = m[m.length - 1];
  }
  return out;
}

// ── The admitted roster ───────────────────────────────────────────────────────
// Flattened from db/vr-roster-admitted.json's waves. The wave a slug sits in records
// which pass admitted it, so a slug is never re-homed and the file reads as a history.
function admittedSlugs() {
  const doc = JSON.parse(readFileSync(ADMITTED, "utf8"));
  const out = new Map();
  for (const [wave, slugs] of Object.entries(doc.waves || {})) {
    if (!Array.isArray(slugs)) continue; // `_note` and friends
    for (const s of slugs) {
      if (out.has(s)) throw new Error(`db/vr-roster-admitted.json lists '${s}' in two waves: ${out.get(s)} and ${wave}`);
      out.set(s, wave);
    }
  }
  if (!out.size) throw new Error("db/vr-roster-admitted.json admitted nobody — refusing to write an empty roster");
  return out;
}

// ── Optional annotation dataset ───────────────────────────────────────────────
async function loadLegislators(local = LEG_LOCAL, url = LEG_URL) {
  try {
    if (existsSync(local)) return JSON.parse(readFileSync(local, "utf8"));
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function buildMap() {
  const fromPhotos = fromBrowsePhotos();
  const slugToBio = { ...fromPhotos };
  for (const [slug, bio] of Object.entries(SEED_SLUGS)) slugToBio[slug] = bio;

  // A SEED_SLUGS entry OVERRIDES a portrait, so a slug named in both places has two
  // claims about who it is and only one of them reaches the ingest. That is the
  // King-Hinds failure with the halves swapped: the map would attribute the votes
  // correctly while the share card drew someone else's face, and neither end would
  // look wrong. Federal wave F6 created the first eight overlaps (hand-named for
  // attribution, then given portraits so their share cards do not open on initials),
  // so the two sources are made to agree out loud rather than silently.
  const disagree = Object.entries(SEED_SLUGS)
    .filter(([slug, bio]) => fromPhotos[slug] && fromPhotos[slug] !== bio)
    .map(([slug, bio]) => `${slug}: SEED_SLUGS says ${bio}, its BROWSE_PHOTOS portrait is ${fromPhotos[slug]}`);
  if (disagree.length) {
    throw new Error(
      `${disagree.length} slug(s) are claimed by two different Bioguides. SEED_SLUGS wins for the ingest, ` +
      `so the votes would attribute one way and the face on the share card would be another member:\n  ` +
      disagree.join("\n  "));
  }

  // Scope to the admitted roster, failing on an admitted slug we cannot resolve rather
  // than shipping a member the ingest will silently never attribute a vote to.
  const admitted = admittedSlugs();
  const unresolved = [...admitted.keys()].filter((s) => !slugToBio[s]);
  if (unresolved.length) {
    throw new Error(
      `db/vr-roster-admitted.json admits ${unresolved.length} slug(s) with no readable Bioguide — ` +
      `add a congressional portrait to BROWSE_PHOTOS or an entry to SEED_SLUGS:\n  ` + unresolved.join("\n  "));
  }
  const unadmitted = Object.keys(slugToBio).filter((s) => !admitted.has(s)).sort();

  // Invert to bioguide → slug, detecting any Bioguide claimed by two slugs.
  const map = {};
  const collisions = [];
  for (const [slug, bio] of Object.entries(slugToBio)) {
    if (!admitted.has(slug)) continue;
    if (map[bio] && map[bio] !== slug) collisions.push(`${bio}: ${map[bio]} vs ${slug}`);
    map[bio] = slug;
  }
  if (collisions.length) throw new Error("Bioguide collisions:\n  " + collisions.join("\n  "));
  return { map, admitted, unadmitted, slugToBio };
}

// Bioguide → authoritative identity, current dataset winning over historical. Used both
// to annotate the human-review block and to cross-check the portraits below, so the two
// can never disagree about who a Bioguide is.
function indexByBio(leg, hist) {
  const byBio = new Map();
  const index = (list, serving) => {
    for (const p of list || []) {
      const t = p.terms[p.terms.length - 1];
      if (byBio.has(p.id.bioguide)) continue; // current wins over historical
      byBio.set(p.id.bioguide, {
        name: p.name.official_full || `${p.name.first} ${p.name.last}`,
        last: p.name.last || "",
        chamber: t.type === "sen" ? "senate" : "house",
        state: t.state,
        party: t.party,
        serving,
      });
    }
  };
  index(leg, true);
  index(hist, false);
  return byBio;
}

function annotate(map, byBio) {
  return Object.entries(map)
    .map(([bioguide, slug]) => {
      const a = byBio.get(bioguide);
      return {
        bioguide,
        slug,
        name: a?.name ?? null,
        chamber: a?.chamber ?? null,
        state: a?.state ?? null,
        party: a?.party ?? null,
        serving119: !!a?.serving, // present in legislators-current ⇒ currently seated
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

// ── The name the app itself publishes for a slug ──────────────────────────────
// cmp-data.js and spotlights-data.js are pure `Object.assign(window.X, {…})` data
// modules — no DOM, no side effects — so they evaluate in a bare sandbox, the same way
// scripts/gen-share-index.mjs reads them. CMP_DATA covers the compare roster; the
// SPOTLIGHTS figure rows are walked afterwards because a member can carry a portrait
// and a stance block without a compare card (haley_stevens today), and dropping those
// would leave exactly the kind of unchecked slug this guard exists to catch.
function rosterNames() {
  try {
    const sandbox = { window: {}, document: {}, console: { log() {}, warn() {}, error() {} } };
    vm.createContext(sandbox);
    for (const f of ["cmp-data.js", "spotlights-data.js"]) {
      vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
    }
    const names = new Map();
    for (const [slug, p] of Object.entries(sandbox.window.CMP_DATA || {})) {
      if (p && typeof p.name === "string") names.set(slug, p.name);
    }
    const walk = (node) => {
      if (Array.isArray(node)) return void node.forEach(walk);
      if (!node || typeof node !== "object") return;
      if (typeof node.id === "string" && typeof node.name === "string" && !names.has(node.id)) {
        names.set(node.id, node.name);
      }
      for (const v of Object.values(node)) walk(v);
    };
    walk(sandbox.window.SPOTLIGHTS || {});
    return names.size ? names : null;
  } catch {
    return null;
  }
}

// ── Does each portrait's Bioguide name the person the app profiles? ───────────
// Deriving the map from a portrait URL removes the name-matching guess, but it makes the
// map only as right as the photo. Point one slug's portrait at another member's file and
// that member's entire voting record silently re-homes onto the wrong profile — and
// nothing downstream looks wrong from either end: the profile has a full stance block,
// the votes have a real source URL, they simply belong to different people. That is how
// 27 of Del. Kimberlyn King-Hinds's (K000404) House votes came to be attributed to Rep.
// Mike Kennedy (K000403) and scored against his stated positions on four issues, undone
// in netlify/database/migrations/20260815000000_vr_fix_kennedy_identity_collision.sql.
// The generator had even printed her name into the review block while writing his slug —
// the map was wrong while its own annotation was right, which is the whole tell.
//
// So the authoritative surname for a mapped Bioguide must appear in the name the app
// publishes for that slug. A disagreement on an ADMITTED slug is a hard error: that is a
// live cross-person attribution. On an unadmitted portrait it is a warning, because those
// attribute nothing yet — and admitting one turns this same check into the error.
//
// Best-effort in the same way annotation is: with no legislators dataset there is nothing
// authoritative to compare against, so the check says it was skipped rather than passing
// quietly, and it reports admitted slugs it could not cross-check for the same reason.
const normName = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function checkNamesAgree(slugToBio, admitted, byBio, names) {
  if (!byBio.size || !names) {
    const why = !byBio.size ? "legislators dataset unavailable" : "app roster names unreadable";
    console.warn(`⚠ portrait identity cross-check SKIPPED (${why}) — the map was written without`);
    console.warn("  verifying that each portrait's Bioguide names the person the app profiles");
    return;
  }
  const errors = [];
  const warnings = [];
  const unverified = [];
  const unnamed = [];
  let checked = 0;
  let declared = 0;
  for (const [slug, bio] of Object.entries(slugToBio)) {
    const auth = byBio.get(bio);
    // The app's published name wins; SEED_NAMES is consulted only for a slug the app
    // publishes no name for, so the wall has two names to compare instead of going
    // quiet on exactly the slug nobody has ever seen a name next to.
    const published = names.get(slug) || null;
    const handDeclared = SEED_NAMES[slug] || null;
    const app = published || handDeclared;
    if (handDeclared) declared++;
    if (!app && admitted.has(slug)) {
      unnamed.push(`${slug} → ${bio}`);
      continue;
    }
    if (!auth || !app) {
      if (admitted.has(slug)) {
        unverified.push(`${slug} (${bio} not in either legislators dataset)`);
      }
      continue;
    }
    checked++;
    // Two compares, and a slug with a SEED_NAMES line faces both.
    //
    // A SEED_NAMES entry is held to the WHOLE name, because it was typed by hand off this
    // same official record and has no reason to differ from it. That strictness is the
    // point: a surname-only compare cannot tell Alan Armstrong (Sen, OK) from Kelly
    // Armstrong (Gov, ND), and those two slugs both exist in this app.
    //
    // An app-published name is held to its SURNAME, because the app publishes the name a
    // reader would recognise and the dataset publishes the legal one — "Mike Simpson"
    // against "Michael K. Simpson" is agreement, not a mismatch, and neguse and
    // mike_simpson would both fail an exact compare today.
    //
    // Before R2 the strict branch ran only while the app published NO name, so publishing
    // one downgraded the slug to surname-only — turning the wall off for the three slugs
    // whose Bioguide is asserted by nothing but a hand-typed table. Now a declaration
    // keeps its strict compare for as long as it exists, and the published name is checked
    // on top of it, so the two sources have to keep agreeing with the record and with each
    // other.
    if (handDeclared) {
      if (normName(handDeclared) !== normName(auth.name)) {
        errors.push(`${slug} → ${bio} is ${auth.name} (${auth.chamber}, ${auth.state}), but SEED_NAMES `
          + `declares "${handDeclared}" — a hand-declared name must match the official record exactly`);
        continue;
      }
      if (published && !(auth.last && normName(published).includes(normName(auth.last)))) {
        errors.push(`${slug} → ${bio} is ${auth.name} (${auth.chamber}, ${auth.state}) and SEED_NAMES agrees, `
          + `but the app publishes "${published}", which does not carry the surname "${auth.last}" — `
          + `the roster and the hand-declared identity have drifted onto two different people`);
        continue;
      }
      continue;
    }
    if (auth.last && normName(app).includes(normName(auth.last))) continue;
    const row = `${slug} → ${bio} is ${auth.name} (${auth.chamber}, ${auth.state}), but the app profiles "${app}"`;
    (admitted.has(slug) ? errors : warnings).push(row);
  }
  // An admitted slug with no name from either source cannot be cross-checked at all,
  // and an unchecked admitted slug is the one that misattributes a whole voting record
  // in silence. Declare it in SEED_NAMES (identity only) or do not admit it.
  if (unnamed.length) {
    throw new Error(
      `${unnamed.length} admitted slug(s) have no published name and no SEED_NAMES entry, so their ` +
      `portrait Bioguide could not be checked against any name. Add the official-record name to ` +
      `SEED_NAMES in this file before admitting them:\n  ` + unnamed.join("\n  "));
  }
  if (errors.length) {
    throw new Error(
      `${errors.length} admitted slug(s) resolve to a Bioguide belonging to someone else — the ingest ` +
      `would attribute one member's votes to another. Repoint the portrait in BROWSE_PHOTOS (or the ` +
      `SEED_SLUGS entry) at the right Bioguide before regenerating:\n  ` + errors.join("\n  "));
  }
  console.log(`✓ portrait identity cross-check — ${checked} slug(s) agree with their Bioguide`
    + (declared ? ` (${declared} also held to SEED_NAMES's exact official-record name)` : ""));
  if (warnings.length) {
    console.warn(`⚠ ${warnings.length} UNADMITTED portrait(s) name a different member. Nothing is attributed`);
    console.warn("  through them today, but admitting one as-is would misattribute that member's votes:");
    for (const w of warnings) console.warn(`    ${w}`);
  }
  if (unverified.length) {
    console.log(`  ${unverified.length} admitted slug(s) could not be cross-checked:`);
    for (const u of unverified) console.log(`    ${u}`);
  }
}

const check = process.argv.includes("--check");
const { map, admitted, unadmitted, slugToBio } = buildMap();
const leg = await loadLegislators();
// Historical is only needed when a mapped member has left Congress, and it is a 13 MB
// file — so it is fetched only if the current dataset left someone unannotated.
const needHist = !!leg && Object.keys(map).some((b) => !leg.some((p) => p.id.bioguide === b));
const hist = needHist ? await loadLegislators(LEG_HIST_LOCAL, LEG_HIST_URL) : null;
const byBio = indexByBio(leg, hist);
const members = annotate(map, byBio);
const serving = members.filter((m) => m.serving119).length;

// Run before anything is written or compared: a map that names the wrong person should
// never reach the file, and --check should fail on one that already has.
checkNamesAgree(slugToBio, admitted, byBio, rosterNames());

// Provenance blocks in the previous file are carried forward: they record how earlier
// waves were staged and reviewed, and regenerating the map is not a reason to lose that.
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

const doc = {
  _comment:
    "bioguide -> roster slug for the Voting Record ingest. Regenerate with scripts/vr-gen-member-map.mjs. " +
    "The ingest reads `map`; `members` is for human review only. Roster scope is db/vr-roster-admitted.json.",
  count: Object.keys(map).length,
  serving119: serving,
  annotated: !!leg,
  unadmittedPortraits: unadmitted.length,
  map,
  members,
};
if (prev._phase12_staged) doc._phase12_staged = prev._phase12_staged;
// Stable, human-diffable output (sorted keys in `map`).
doc.map = Object.fromEntries(Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])));
const json = JSON.stringify(doc, null, 2) + "\n";

if (check) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  // Compare ignoring the (dataset-dependent) annotation so --check is deterministic offline.
  const norm = (s) => JSON.stringify(JSON.parse(s || "{}").map || {});
  if (norm(cur) !== norm(json)) {
    console.error("✗ db/vr-member-map.json is out of date — run: node scripts/vr-gen-member-map.mjs");
    process.exit(1);
  }
  console.log(`✓ member map up to date — ${doc.count} entries (${serving} currently serving)`);
} else {
  writeFileSync(OUT, json);
  console.log(`✓ wrote ${OUT}`);
  console.log(`  ${doc.count} bioguide→slug entries, ${serving} currently serving${leg ? "" : " (annotation dataset unavailable)"}`);
  console.log(`  ${unadmitted.length} curated congressional portrait(s) are NOT admitted to the roster and attribute nothing`);
}
