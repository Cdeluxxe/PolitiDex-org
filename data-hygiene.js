// ─────────────────────────────────────────────────────────────────────────────
// data-hygiene.js — the de-duplicated, stub-free view of PROFILES
// ─────────────────────────────────────────────────────────────────────────────
// Lifted verbatim out of expansion-controller.js during the critical-path strip.
// It lived there for historical reasons — the admin bulk-import tool is what
// surfaced the duplicate/stub problem — but it is not an admin tool. It is the
// layer every PUBLIC surface reads through: _populateDirData() in
// profiles-full.js builds the All Politicians directory and the dashboard counts
// from window._cleanProfiles(), so without it a visitor sees the same person
// twice and counts inflated by empty records.
//
// That mattered the moment the admin controllers stopped loading for anonymous
// visitors. Gating 458 KB of admin JS behind the admin gate would have silently
// taken this with it and degraded the public roster, so it moves here and stays
// on the critical path, at the same document position the controllers used to
// occupy. Nothing about the logic changed: same functions, same globals
// (window._cleanProfiles, window._dataHygiene), same pure-read contract.
//
// Guarded by scripts/test-admin-not-on-critical-path.mjs, which fails if this
// helper drifts back inside an admin-gated module.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    // ══════════════════════════════════════════════════════════════
    // DATA HYGIENE — de-duplicate & suppress stub records (public view)
    // ──────────────────────────────────────────────────────────────
    // The live Firestore "politicians" collection accumulates two kinds of
    // noise over time: duplicate records for the same person (re-imported or
    // entered twice) and empty "stub" records that carry no real content (no
    // bio, no key issues, no genuine stances). Those make the public site feel
    // messy and inflate the headline count.
    //
    // Rather than mutate the live database, the public surfaces (the All
    // Politicians directory and the dashboard counts) are built from a CLEANED
    // view of PROFILES produced by window._cleanProfiles(): each set of
    // same-name records collapses to the single richest one, and stub records
    // are dropped. Nothing is deleted from Firestore — the admin Politician
    // Manager still reads the raw PROFILES and shows every record with its
    // "Stub" / "Potential Duplicate" badges, so duplicates and stubs remain
    // visible there to be merged, filled in, or removed for good. This layer
    // simply guarantees visitors see an accurate, tidy roster no matter what
    // state the database is in, and is fully idempotent and non-destructive.
    // ══════════════════════════════════════════════════════════════
    (function () {
      function _hyNormName(s) {
        return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      }
      // Mirrors the Politician Manager's placeholder/stub rules so the public
      // and admin views agree on what counts as "no real content".
      function _hyIsPlaceholderStance(v) {
        if (v == null) return true;
        var t = String(v).trim().toLowerCase();
        if (!t) return true;
        if (t === 'no stated position') return true;
        if (t === 'n/a') return true;
        if (t.indexOf('stance on ') === 0) return true;
        return false;
      }
      function _hyStanceCount(p) {
        var n = 0;
        if (p && p.stances && typeof p.stances === 'object') {
          for (var k in p.stances) {
            if (Object.prototype.hasOwnProperty.call(p.stances, k) &&
                !_hyIsPlaceholderStance(p.stances[k])) { n++; }
          }
        }
        return n;
      }
      function _hyIssues(p) {
        var raw = (p && (p.keyIssues || p.issues)) || [];
        return Array.isArray(raw) ? raw : [];
      }
      // A record is a stub when it has no real, human-entered content. An
      // explicit admin override (profileStatus) always wins.
      function _hyIsStub(p) {
        if (!p) return true;
        if (p.profileStatus === 'stub') return true;
        if (p.profileStatus === 'full') return false;
        if (p.bio && String(p.bio).trim()) return false;
        if (_hyIssues(p).length) return false;
        if (_hyStanceCount(p) > 0) return false;
        return true;
      }
      // Higher = richer record. Decides which member of a duplicate group to
      // keep so a merge never loses the better profile.
      function _hyCompleteness(p) {
        if (!p) return 0;
        var s = 0;
        if (p.bio && String(p.bio).trim()) s += 5;
        s += Math.min(_hyIssues(p).length, 6);
        s += _hyStanceCount(p);
        if (p.score != null) s += 2;
        if ((p.kept || 0) + (p.broken || 0) + (p.pending || 0) > 0) s += 2;
        if (p.photo && String(p.photo).trim()) s += 1;
        if (p.profileStatus === 'full') s += 3;
        return s;
      }

      // Build the cleaned view of PROFILES. Pure read — never mutates PROFILES
      // or Firestore. Returns the cleaned id->record map plus counts so the
      // result can be reported. Cached per PROFILES size so repeated calls
      // during a render pass stay cheap.
      window._cleanProfiles = function () {
        var raw = (typeof PROFILES === 'object' && PROFILES) ? PROFILES : {};
        var ids = Object.keys(raw);

        // 1) Group by normalized name to surface duplicates. Records with no
        //    usable name fall back to their own id so they never merge together.
        var groups = {};
        ids.forEach(function (id) {
          var key = _hyNormName(raw[id] && raw[id].name) || ('__id_' + id);
          (groups[key] = groups[key] || []).push(id);
        });

        var keep = {};
        var dupRemoved = 0, dupGroups = 0, stubRemoved = 0;
        var mergedAwayIds = [], stubIds = [];

        Object.keys(groups).forEach(function (key) {
          var members = groups[key];
          // Canonical = richest record; ties broken by id for stability.
          var canonical = members.slice().sort(function (a, b) {
            var diff = _hyCompleteness(raw[b]) - _hyCompleteness(raw[a]);
            if (diff !== 0) return diff;
            return a < b ? -1 : (a > b ? 1 : 0);
          })[0];

          if (members.length > 1) {
            dupGroups++;
            members.forEach(function (id) {
              if (id !== canonical) { dupRemoved++; mergedAwayIds.push(id); }
            });
          }

          // 2) Drop the canonical too if it is still an empty stub. A real,
          //    unique profile only needs one genuine field (a bio, an issue,
          //    or one real stance) to clear this bar, so legitimate low-info
          //    candidates are kept while truly empty placeholders are hidden.
          if (_hyIsStub(raw[canonical])) {
            stubRemoved++; stubIds.push(canonical);
            return;
          }
          keep[canonical] = raw[canonical];
        });

        var result = {
          profiles: keep,
          total: ids.length,
          kept: Object.keys(keep).length,
          dupGroups: dupGroups,
          dupRemoved: dupRemoved,
          stubRemoved: stubRemoved,
          mergedAwayIds: mergedAwayIds,
          stubIds: stubIds
        };
        window._dataHygiene = result;
        return result;
      };
    })();
})();
