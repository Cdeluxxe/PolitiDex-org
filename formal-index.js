/* ═══════════════════════════════════════════════════════════════════════════
   formal-index.js — GENERATED. Do not edit by hand.
     regenerate:  node scripts/gen-formal-index.mjs
   ────────────────────────────────────────────────────────────────────────────
   How much formal record is on file per person, and — where a file is empty —
   one reviewed sentence saying why. Counted from the shipped Utah lane seeds;
   see scripts/gen-formal-index.mjs for what is counted and what is refused.

   TWO CALLERS, ONE COUNT. publication-floor.js reads this as its third source,
   so a file holding sourced formal acts and no cited stance card is no longer
   greeted with "record still being built"; and person-file.js reads it to pick
   which of three honest things the kicker says. It carries no score, no tier
   and no ranking, and no surface prints these figures.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  if (root.PDXFormalIndex) return;

  var SESSIONS = ['2023GS', '2024GS', '2025GS'];

  // pid -> [sourced acts on file, distinct measures with a sourced act]
  var COUNTS = {
    'amillner': [64, 60],
    'andrew_stoddard': [134, 128],
    'anthony_loubet': [121, 120],
    'aromero': [142, 127],
    'ashlee_matthews': [117, 114],
    'auxier_h4': [56, 54],
    'blouin_s13': [95, 84],
    'bolinder_h68': [131, 120],
    'brammer_s21': [119, 117],
    'brett_garner': [68, 67],
    'brian_king': [87, 85],
    'bwilson': [38, 38],
    'calvin_roberts': [41, 39],
    'candice_pierucci': [146, 133],
    'carl_albrecht': [131, 121],
    'carol_spackman_moss': [153, 135],
    'cbramble': [50, 46],
    'cheryl_acton': [131, 127],
    'chew_h68': [125, 118],
    'christine_watkins': [131, 124],
    'clinton_okerlund': [46, 43],
    'cmusselman': [136, 132],
    'colin_w_jack': [123, 115],
    'cory_maloy_h52': [132, 129],
    'cwilson': [80, 74],
    'daniel_thatcher': [63, 62],
    'david_buxton': [43, 37],
    'david_shallenberger': [44, 41],
    'defay_h15': [77, 74],
    'dhinkins': [77, 69],
    'dipson': [76, 72],
    'doug_fiefia': [44, 43],
    'doug_owens': [126, 117],
    'doug_welton': [120, 115],
    'dowens_st': [78, 71],
    'eliason_h45': [127, 122],
    'evickers': [82, 77],
    'fitisemanu_h30': [42, 40],
    'gay_lynn_bennion': [124, 117],
    'grant_miller': [49, 48],
    'gricius_h50': [126, 121],
    'gwynn_h6': [126, 119],
    'hall_h11': [142, 124],
    'harper_s16': [71, 68],
    'heidi_balderree': [58, 53],
    'hoang_nguyen': [42, 41],
    'hollins_h24': [131, 122],
    'ivory_h39': [112, 109],
    'jacob_anderegg': [19, 16],
    'jake_sawyer': [42, 40],
    'james_cobb': [86, 80],
    'james_dunnigan': [109, 108],
    'jason_b_kyle': [132, 122],
    'jason_thompson': [50, 50],
    'jefferson_burton': [127, 121],
    'jefferson_moss': [107, 105],
    'jeffrey_stenquist': [69, 68],
    'jennifer_dailey_provost': [124, 118],
    'jennifer_plumb': [69, 65],
    'joel_briscoe': [35, 32],
    'john_johnson': [75, 67],
    'jon_hawkins': [128, 125],
    'joseph_elison': [146, 131],
    'jstevenson': [67, 64],
    'judy_weeks_rohner': [86, 81],
    'karen_m_peterson': [122, 114],
    'kathleen_riebe': [75, 67],
    'kay_christofferson': [125, 119],
    'kcullimore': [88, 83],
    'kera_birkeland': [93, 83],
    'kgrover': [64, 59],
    'koford_h10': [48, 44],
    'kohler_h59': [124, 117],
    'kristen_chevrier': [41, 39],
    'kstratton': [108, 103],
    'kwan_s12': [83, 77],
    'lescamilla': [103, 95],
    'lincoln_fillmore': [85, 76],
    'lisa_shepherd': [46, 43],
    'lisonbee_h14': [134, 123],
    'logan_monson': [45, 41],
    'mark_strong': [117, 112],
    'mark_wheatley': [78, 77],
    'matt_macpherson': [84, 79],
    'mballard': [123, 115],
    'mccay_s11': [81, 78],
    'mckell_s25': [73, 68],
    'mike_petersen': [144, 134],
    'mschultz': [109, 105],
    'nelson_abbott': [127, 123],
    'nicholeen_p_peck': [52, 49],
    'nthurston': [133, 128],
    'paul_a_cutler': [107, 106],
    'quinn_kotter': [50, 46],
    'r_neil_walter': [132, 122],
    'robert_spendlove': [72, 71],
    'rosalba_dominguez': [45, 42],
    'rosemary_lesser': [75, 74],
    'rshipp': [132, 123],
    'rward': [111, 108],
    'rwinterton': [75, 69],
    'ryan_d_wilcox': [125, 118],
    'sadams': [51, 50],
    'sahara_hayes': [151, 141],
    'shelley_h66': [44, 42],
    'snider_h5': [113, 108],
    'ssandall': [79, 72],
    'stephanie_pitcher': [75, 72],
    'steven_lund': [97, 84],
    'stewart_e_barlow': [125, 120],
    'susan_pulsipher': [87, 78],
    'teuscher_h44': [106, 106],
    'thomas_peterson': [120, 116],
    'tim_jimenez': [84, 80],
    'tlee': [123, 118],
    'tracy_miller': [49, 46],
    'tweiler': [91, 84],
    'tyler_clancy': [139, 129],
    'valpeterson_h56': [123, 117],
    'verona_mauga': [36, 36],
    'walt_brooks': [121, 116],
    'whyte_h63': [130, 123],
  };

  // pid -> [reason code, one reviewed sentence]. Documentation status, never a
  // verdict on the person. Hand-written in db/vr-utah-empty-file-notes.json.
  var EMPTY = {
    'emily_buss': ['seated_after', 'Seated in December 2025, after the last session on file — there is no session here she could have voted in yet.'],
    'fgibson': ['left_before', 'A former member whose roster record still reads as sitting; he was out of the Legislature before the earliest session on file, and the district on the record belongs to somebody else.'],
    'grant_pace': ['seated_after', 'Seated in 2026, after every session on file — no roll call in the lane was his to cast.'],
    'jackie_larson': ['seated_after', 'Seated in 2026, after every session on file — no roll call in the lane was hers to cast.'],
    'jdraxler': ['left_before', 'Left the Legislature in 2017, before the earliest session on file; the roster still carries a sitting-member label for him, which is a separate correction.'],
    'jknotts': ['left_before', 'A former-member record from before the earliest session on file, and one under review: the name looks like a garbled John Knotwell and the district on it belongs to a sitting representative.'],
    'john_arthur': ['seated_after', 'Seated in December 2025, after the last session on file — there is no session here he could have voted in yet.'],
    'jwestwood': ['left_before', 'Served 2013–2019 and left the Legislature four years before the earliest session on file.'],
    'leah_hansen': ['seated_after', 'Seated in August 2025, after the 2025 general session had adjourned — no session on file overlaps her service.'],
    'rob_bishop': ['seated_after', 'Seated in 2026, after every session on file — no roll call in the lane was his to cast.'],
  };

  function row(pid) { return (typeof pid === 'string' && COUNTS[pid]) || null; }
  function acts(pid) { var r = row(pid); return r ? r[0] : 0; }
  function measures(pid) { var r = row(pid); return r ? r[1] : 0; }
  function has(pid) { return acts(pid) > 0; }
  function emptyNote(pid) {
    if (has(pid)) return null;              // not empty: the note would be false
    var e = (typeof pid === 'string' && EMPTY[pid]) || null;
    return e ? { reason: e[0], note: e[1] } : null;
  }

  root.PDXFormalIndex = {
    SESSIONS_ON_FILE: SESSIONS,
    acts: acts,
    measures: measures,
    has: has,
    emptyNote: emptyNote,
    _counts: COUNTS,
    _empty: EMPTY
  };
})();
