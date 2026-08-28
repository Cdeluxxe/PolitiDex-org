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
    'amillner': [63, 59],
    'andrew_stoddard': [120, 114],
    'anthony_loubet': [115, 114],
    'aromero': [134, 119],
    'ashlee_matthews': [112, 109],
    'auxier_h4': [56, 54],
    'blouin_s13': [86, 75],
    'bolinder_h68': [121, 110],
    'brammer_s21': [119, 117],
    'brett_garner': [4, 4],
    'brian_king': [13, 13],
    'bwilson': [38, 38],
    'calvin_roberts': [41, 39],
    'candice_pierucci': [137, 124],
    'carl_albrecht': [125, 115],
    'carol_spackman_moss': [144, 126],
    'cbramble': [38, 34],
    'cheryl_acton': [125, 121],
    'chew_h68': [120, 113],
    'christine_watkins': [125, 118],
    'clinton_okerlund': [46, 43],
    'cmusselman': [122, 118],
    'colin_w_jack': [120, 112],
    'cory_maloy_h52': [119, 116],
    'cwilson': [74, 68],
    'daniel_thatcher': [63, 62],
    'david_buxton': [12, 12],
    'david_shallenberger': [44, 41],
    'defay_h15': [77, 74],
    'dhinkins': [71, 63],
    'dipson': [72, 68],
    'doug_fiefia': [44, 43],
    'doug_owens': [119, 110],
    'doug_welton': [118, 113],
    'dowens_st': [73, 66],
    'eliason_h45': [119, 114],
    'evickers': [75, 70],
    'fitisemanu_h30': [42, 40],
    'gay_lynn_bennion': [118, 111],
    'grant_miller': [49, 48],
    'gricius_h50': [116, 111],
    'gwynn_h6': [115, 108],
    'hall_h11': [132, 114],
    'harper_s16': [71, 68],
    'heidi_balderree': [58, 53],
    'hoang_nguyen': [42, 41],
    'hollins_h24': [119, 110],
    'ivory_h39': [108, 105],
    'jacob_anderegg': [4, 4],
    'jake_sawyer': [42, 40],
    'james_cobb': [14, 14],
    'james_dunnigan': [109, 108],
    'jason_b_kyle': [127, 117],
    'jason_thompson': [50, 50],
    'jefferson_burton': [116, 110],
    'jefferson_moss': [104, 102],
    'jeffrey_stenquist': [3, 3],
    'jennifer_dailey_provost': [113, 107],
    'jennifer_plumb': [63, 59],
    'joel_briscoe': [8, 8],
    'john_johnson': [69, 61],
    'jon_hawkins': [122, 119],
    'joseph_elison': [138, 123],
    'jstevenson': [65, 62],
    'judy_weeks_rohner': [15, 15],
    'karen_m_peterson': [117, 109],
    'kathleen_riebe': [71, 63],
    'kay_christofferson': [121, 115],
    'kcullimore': [80, 75],
    'kera_birkeland': [21, 21],
    'kgrover': [60, 55],
    'koford_h10': [48, 44],
    'kohler_h59': [120, 113],
    'kristen_chevrier': [41, 39],
    'kstratton': [108, 103],
    'kwan_s12': [75, 69],
    'lescamilla': [95, 87],
    'lincoln_fillmore': [81, 72],
    'lisa_shepherd': [46, 43],
    'lisonbee_h14': [123, 112],
    'logan_monson': [45, 41],
    'mark_strong': [117, 112],
    'mark_wheatley': [9, 9],
    'matt_macpherson': [84, 79],
    'mballard': [115, 107],
    'mccay_s11': [81, 78],
    'mckell_s25': [70, 65],
    'mike_petersen': [132, 122],
    'mschultz': [106, 102],
    'nelson_abbott': [124, 120],
    'nicholeen_p_peck': [52, 49],
    'nthurston': [120, 115],
    'paul_a_cutler': [107, 106],
    'quinn_kotter': [4, 4],
    'r_neil_walter': [125, 115],
    'robert_spendlove': [3, 3],
    'rosalba_dominguez': [45, 42],
    'rosemary_lesser': [5, 5],
    'rshipp': [125, 116],
    'rward': [107, 104],
    'rwinterton': [70, 64],
    'ryan_d_wilcox': [113, 106],
    'sadams': [51, 50],
    'sahara_hayes': [134, 124],
    'shelley_h66': [44, 42],
    'snider_h5': [113, 108],
    'ssandall': [69, 62],
    'stephanie_pitcher': [72, 69],
    'steven_lund': [23, 23],
    'stewart_e_barlow': [119, 114],
    'susan_pulsipher': [17, 17],
    'teuscher_h44': [106, 106],
    'thomas_peterson': [113, 109],
    'tim_jimenez': [11, 11],
    'tlee': [112, 107],
    'tracy_miller': [49, 46],
    'tweiler': [85, 78],
    'tyler_clancy': [132, 122],
    'valpeterson_h56': [118, 112],
    'verona_mauga': [36, 36],
    'walt_brooks': [114, 109],
    'whyte_h63': [116, 109],
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
