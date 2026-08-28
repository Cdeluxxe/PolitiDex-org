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
    'amillner': [56, 54],
    'andrew_stoddard': [114, 110],
    'anthony_loubet': [111, 111],
    'aromero': [123, 115],
    'ashlee_matthews': [107, 105],
    'auxier_h4': [54, 52],
    'blouin_s13': [74, 66],
    'bolinder_h68': [113, 107],
    'brammer_s21': [113, 111],
    'bwilson': [38, 38],
    'calvin_roberts': [38, 36],
    'candice_pierucci': [124, 120],
    'carl_albrecht': [119, 112],
    'carol_spackman_moss': [132, 123],
    'cbramble': [35, 33],
    'cheryl_acton': [120, 118],
    'chew_h68': [116, 110],
    'christine_watkins': [120, 115],
    'clinton_okerlund': [44, 41],
    'cmusselman': [112, 111],
    'colin_w_jack': [113, 109],
    'cory_maloy_h52': [113, 113],
    'cwilson': [67, 63],
    'daniel_thatcher': [58, 57],
    'david_shallenberger': [41, 39],
    'defay_h15': [73, 70],
    'dhinkins': [63, 56],
    'dipson': [66, 63],
    'doug_fiefia': [41, 41],
    'doug_owens': [114, 107],
    'doug_welton': [111, 110],
    'dowens_st': [64, 58],
    'eliason_h45': [113, 110],
    'evickers': [65, 62],
    'fitisemanu_h30': [39, 37],
    'gay_lynn_bennion': [113, 107],
    'grant_miller': [46, 46],
    'gricius_h50': [109, 108],
    'gwynn_h6': [107, 104],
    'hall_h11': [120, 111],
    'harper_s16': [67, 64],
    'heidi_balderree': [54, 49],
    'hoang_nguyen': [40, 39],
    'hollins_h24': [110, 106],
    'ivory_h39': [103, 101],
    'jake_sawyer': [39, 37],
    'james_dunnigan': [105, 104],
    'jason_b_kyle': [120, 114],
    'jason_thompson': [48, 48],
    'jefferson_burton': [109, 107],
    'jefferson_moss': [100, 99],
    'jennifer_dailey_provost': [106, 104],
    'jennifer_plumb': [55, 54],
    'john_johnson': [62, 56],
    'jon_hawkins': [117, 116],
    'joseph_elison': [129, 120],
    'jstevenson': [58, 57],
    'karen_m_peterson': [109, 106],
    'kathleen_riebe': [65, 58],
    'kay_christofferson': [115, 111],
    'kcullimore': [71, 67],
    'kgrover': [52, 49],
    'koford_h10': [46, 42],
    'kohler_h59': [116, 110],
    'kristen_chevrier': [39, 37],
    'kstratton': [102, 98],
    'kwan_s12': [66, 62],
    'lescamilla': [83, 80],
    'lincoln_fillmore': [75, 67],
    'lisa_shepherd': [44, 41],
    'lisonbee_h14': [113, 109],
    'logan_monson': [43, 39],
    'mark_strong': [113, 109],
    'matt_macpherson': [80, 75],
    'mballard': [108, 104],
    'mccay_s11': [76, 73],
    'mckell_s25': [64, 60],
    'mike_petersen': [122, 117],
    'mschultz': [101, 99],
    'nelson_abbott': [119, 117],
    'nicholeen_p_peck': [50, 47],
    'nthurston': [112, 110],
    'paul_a_cutler': [103, 103],
    'r_neil_walter': [116, 111],
    'rosalba_dominguez': [42, 39],
    'rshipp': [120, 113],
    'rward': [102, 100],
    'rwinterton': [61, 56],
    'ryan_d_wilcox': [106, 103],
    'sadams': [45, 45],
    'sahara_hayes': [124, 120],
    'shelley_h66': [41, 40],
    'snider_h5': [110, 105],
    'ssandall': [57, 53],
    'stephanie_pitcher': [63, 61],
    'stewart_e_barlow': [113, 110],
    'teuscher_h44': [103, 103],
    'thomas_peterson': [109, 106],
    'tlee': [107, 104],
    'tracy_miller': [46, 43],
    'tweiler': [73, 70],
    'tyler_clancy': [123, 119],
    'valpeterson_h56': [110, 108],
    'verona_mauga': [34, 34],
    'walt_brooks': [110, 106],
    'whyte_h63': [109, 106],
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
