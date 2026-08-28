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
      // A RETIRED KEY IS NOT A SECOND PERSON. PDX_PROFILE_ALIAS (profile-evidence.js)
      // is this repo's standing assertion that the id on its left names the same
      // officeholder as the id on its right, so a live Firestore document filed
      // under a retired key is the same person as the roster record — not a
      // duplicate to be judged on richness, and not a unique profile because it
      // happens to be the only PROFILES doc answering to that name.
      //
      // Name-grouping below cannot catch this on its own. The canonical record
      // often lives only in CMP_DATA (chew_h68 is a roster record with a 90-act
      // formal file and no Firestore document), which leaves the retired doc alone
      // in its name group, looking unique, and the public directory advertises one
      // Utah House District 68 seat as two current files under two addresses.
      //
      // So the retirement is applied before richness: a retired key can never win
      // its group, and a group with nothing but retired keys is filed under the
      // canonical id — the address the person file actually opens.
      function _hyCanonId(id) {
        try {
          if (typeof window.PDXProfilePid === 'function') {
            var a = window.PDXProfilePid(id);
            if (a && a !== id) return String(a);
          }
        } catch (e) {}
        return id;
      }
      function _hyRetired(id) { return _hyCanonId(id) !== id; }

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
        var mergedAwayIds = [], stubIds = [], retiredIds = [];

        Object.keys(groups).forEach(function (key) {
          var members = groups[key];
          // Canonical = the richest record that is not filed under a retired key;
          // ties broken by id for stability.
          var canonical = members.slice().sort(function (a, b) {
            var ra = _hyRetired(a) ? 1 : 0, rb = _hyRetired(b) ? 1 : 0;
            if (ra !== rb) return ra - rb;
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

          // 3) File it under the canonical id. Unchanged for every ordinary
          //    record (publicId === canonical); for a retired key it retires the
          //    duplicate address, and if the canonical id is already filed the
          //    retired record merges away rather than overwriting it.
          var publicId = _hyCanonId(canonical);
          if (publicId !== canonical) retiredIds.push(canonical);
          if (Object.prototype.hasOwnProperty.call(keep, publicId)) {
            dupRemoved++; mergedAwayIds.push(canonical);
            return;
          }
          keep[publicId] = raw[canonical];
        });

        var result = {
          profiles: keep,
          total: ids.length,
          kept: Object.keys(keep).length,
          dupGroups: dupGroups,
          dupRemoved: dupRemoved,
          stubRemoved: stubRemoved,
          mergedAwayIds: mergedAwayIds,
          stubIds: stubIds,
          retiredIds: retiredIds
        };
        window._dataHygiene = result;
        return result;
      };
    })();
})();
