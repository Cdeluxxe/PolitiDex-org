/**
 * PolitiDex Stance Helper Functions
 * Extracted from index.html for maintainability
 * These functions operate on ISSUE_STANCE_DATA and power politician position lookups.
 */
(function() {
    'use strict';

    // ── Shared issue linkage (Alignment Tool ⇄ politician profiles) ──────
    // Build a lookup of a politician's documented positions, keyed by the SAME
    // ISSUE_MAP keys the Alignment Tool uses, so a visitor's saved positions can be
    // matched against the politician one-to-one. The curated ISSUE_STANCE_DATA
    // is the single source of truth: any stance carrying an `issueKey` becomes a
    // comparable position. Extend coverage by adding issueKey/issueStance to a
    // stance — no parallel data structure to keep in sync.
    // Aliases so a record stored under a short id still finds curated data keyed
    // under another id (and vice-versa). Maps id → the ISSUE_STANCE_DATA key.
    var STANCE_ALIASES = {
      blake_moore:'bmoore', burgess_owens:'owens', mike_kennedy:'kennedy',
      celeste_maloy:'maloy', spencer_cox:'cox', mike_lee:'lee', john_curtis:'curtis',
      donald_trump:'trump',
      // Name-variant aliases for the 2026-cycle additions, so a record stored under
      // a slightly different display-name slug still lights up the curated data.
      stuart_adams:'j_stuart_adams', president_adams:'j_stuart_adams',
      jen_dailey_provost:'jennifer_dailey_provost',
      gaylynn_bennion:'gay_lynn_bennion',
      kirk_a_cullimore:'kirk_cullimore', val_l_peterson:'val_peterson',
      deidre_m_henderson:'deidre_henderson',
      // 2026-cycle expansion: map the directory's short ids to the curated
      // name-slug stance keys added above so each profile lights up.
      fillmore:'lincoln_fillmore', harper:'wayne_harper', stevenson:'jerry_stevenson',
      millner:'ann_millner', sandall_s:'scott_sandall', sandall:'scott_sandall',
      grover:'keith_grover', teuscher:'jordan_teuscher', spackman_moss:'carol_spackman_moss',
      cbramble:'curt_bramble', dipson:'don_ipson',
      // After duplicate cleanup, the richer McCay/McKell records are kept under
      // their short ids; point them at the curated name-slug stance keys so their
      // profiles still light up the curated positions.
      dmccay:'daniel_mccay', mmckell:'mike_mckell'
    };
    window.STANCE_ALIASES = STANCE_ALIASES;

    // Slugify a name the same way the directory import builds its document ids.
    function _stanceSlug(s) {
      return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }
    // Resolve a politician's curated stance list robustly: try the id directly, an
    // explicit alias, then a slug of their display name. This lets the curated data
    // light up whether a record is stored under a short id ("owens") or the
    // name-slug the importer generates ("burgess_owens").
    function _resolveStanceList(id, p) {
      if (typeof ISSUE_STANCE_DATA === 'undefined') return null;
      if (id && ISSUE_STANCE_DATA[id]) return ISSUE_STANCE_DATA[id];
      if (id && STANCE_ALIASES[id] && ISSUE_STANCE_DATA[STANCE_ALIASES[id]]) return ISSUE_STANCE_DATA[STANCE_ALIASES[id]];
      var nameSlug = (p && p.name) ? _stanceSlug(p.name) : '';
      if (nameSlug && ISSUE_STANCE_DATA[nameSlug]) return ISSUE_STANCE_DATA[nameSlug];
      if (nameSlug && STANCE_ALIASES[nameSlug] && ISSUE_STANCE_DATA[STANCE_ALIASES[nameSlug]]) return ISSUE_STANCE_DATA[STANCE_ALIASES[nameSlug]];
      return null;
    }
    window._resolveStanceList = _resolveStanceList;

    function _polPositionMap(id, p) {
      var out = {};
      var list = _resolveStanceList(id, p);
      if (!list) return out;
      list.forEach(function(s) {
        if (!s || !s.issueKey) return;
        out[s.issueKey] = {
          stance: s.issueStance || s.pos || 'mixed',
          topic: s.topic, text: s.text, icon: s.icon,
          evidence: s.evidence, source: s.source
        };
      });
      return out;
    }
    window._polPositionMap = _polPositionMap;

})();
