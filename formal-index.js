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
    'amillner': [60, 58],
    'andrew_stoddard': [117, 113],
    'anthony_loubet': [114, 114],
    'aromero': [126, 118],
    'ashlee_matthews': [110, 108],
    'auxier_h4': [56, 54],
    'blouin_s13': [78, 70],
    'bolinder_h68': [116, 110],
    'brammer_s21': [118, 116],
    'bwilson': [38, 38],
    'calvin_roberts': [40, 38],
    'candice_pierucci': [127, 123],
    'carl_albrecht': [122, 115],
    'carol_spackman_moss': [135, 126],
    'cbramble': [35, 33],
    'cheryl_acton': [123, 121],
    'chew_h68': [119, 113],
    'christine_watkins': [123, 118],
    'clinton_okerlund': [46, 43],
    'cmusselman': [117, 116],
    'colin_w_jack': [116, 112],
    'cory_maloy_h52': [116, 116],
    'cwilson': [71, 67],
    'daniel_thatcher': [62, 61],
    'david_shallenberger': [43, 41],
    'defay_h15': [76, 73],
    'dhinkins': [67, 60],
    'dipson': [70, 67],
    'doug_fiefia': [43, 43],
    'doug_owens': [117, 110],
    'doug_welton': [114, 113],
    'dowens_st': [68, 62],
    'eliason_h45': [116, 113],
    'evickers': [69, 66],
    'fitisemanu_h30': [41, 39],
    'gay_lynn_bennion': [116, 110],
    'grant_miller': [48, 48],
    'gricius_h50': [112, 111],
    'gwynn_h6': [110, 107],
    'hall_h11': [123, 114],
    'harper_s16': [71, 68],
    'heidi_balderree': [58, 53],
    'hoang_nguyen': [42, 41],
    'hollins_h24': [113, 109],
    'ivory_h39': [106, 104],
    'jake_sawyer': [41, 39],
    'james_dunnigan': [108, 107],
    'jason_b_kyle': [123, 117],
    'jason_thompson': [50, 50],
    'jefferson_burton': [112, 110],
    'jefferson_moss': [103, 102],
    'jennifer_dailey_provost': [109, 107],
    'jennifer_plumb': [59, 58],
    'john_johnson': [66, 60],
    'jon_hawkins': [120, 119],
    'joseph_elison': [132, 123],
    'jstevenson': [62, 61],
    'karen_m_peterson': [112, 109],
    'kathleen_riebe': [69, 62],
    'kay_christofferson': [118, 114],
    'kcullimore': [75, 71],
    'kgrover': [56, 53],
    'koford_h10': [48, 44],
    'kohler_h59': [119, 113],
    'kristen_chevrier': [41, 39],
    'kstratton': [107, 103],
    'kwan_s12': [70, 66],
    'lescamilla': [87, 84],
    'lincoln_fillmore': [79, 71],
    'lisa_shepherd': [46, 43],
    'lisonbee_h14': [116, 112],
    'logan_monson': [45, 41],
    'mark_strong': [116, 112],
    'matt_macpherson': [83, 78],
    'mballard': [111, 107],
    'mccay_s11': [80, 77],
    'mckell_s25': [68, 64],
    'mike_petersen': [125, 120],
    'mschultz': [104, 102],
    'nelson_abbott': [122, 120],
    'nicholeen_p_peck': [52, 49],
    'nthurston': [115, 113],
    'paul_a_cutler': [106, 106],
    'r_neil_walter': [119, 114],
    'rosalba_dominguez': [44, 41],
    'rshipp': [123, 116],
    'rward': [105, 103],
    'rwinterton': [65, 60],
    'ryan_d_wilcox': [109, 106],
    'sadams': [49, 49],
    'sahara_hayes': [127, 123],
    'shelley_h66': [43, 42],
    'snider_h5': [113, 108],
    'ssandall': [61, 57],
    'stephanie_pitcher': [67, 65],
    'stewart_e_barlow': [116, 113],
    'teuscher_h44': [106, 106],
    'thomas_peterson': [112, 109],
    'tlee': [110, 107],
    'tracy_miller': [48, 45],
    'tweiler': [77, 74],
    'tyler_clancy': [126, 122],
    'valpeterson_h56': [113, 111],
    'verona_mauga': [36, 36],
    'walt_brooks': [113, 109],
    'whyte_h63': [112, 109],
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
