// ─────────────────────────────────────────────────────────────────────────────
// spotlight-index.js — the front page's card-sized view of the Spotlight shelf
//
// GENERATED FILE. Do not hand-edit: run `node scripts/gen-spotlight-index.mjs`
// (the template lives at scripts/spotlight-index.head.js). scripts/
// test-spotlight-shell.mjs rebuilds it in memory and fails on any drift.
//
// WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT
// /issue/<slug> is its own document now (spotlight.html), and the 1.2 MB
// spotlights-data.js corpus went with it. But the homepage still legitimately
// needs to KNOW about Spotlights: Local Issues shows the fights near where you
// vote, the profile modal calls out a Spotlight that features the person you
// are reading, search offers them as suggestions. All of that needs a slug, a
// title, a place, a blurb, a few issue keys and the documentation badge —
// roughly 1.5% of the corpus. So this file carries exactly that, and every
// door it feeds is an ordinary navigation to /issue/<slug>.
//
// It is NOT a second Spotlight UI and NOT a reader. There is no timeline here,
// no evidence, no case-for/case-against, no stance roster, no body copy. A
// caller that wants any of that must go to the address. Accordingly:
//   • open(slug) NAVIGATES. It does not open an overlay — there is no overlay
//     on the front page any more, by design.
//   • close() is a no-op kept only so old guarded callers do not throw.
//   • forPolitician() answers from a precomputed id → slug map rather than by
//     scanning 1,260 roster rows that are not here.
// The shape of the records is the subset of the corpus record that the
// homepage actually read, with the same field names, so the consumers that
// were written against window.PDXSpotlight keep working unchanged.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  if (window.PDXSpotlight) return; // spotlight-engine.js owns the name on /issue/*

/* @@ROWS@@ */
  var BY_SLUG = {};
  ROWS.forEach(function (r) { BY_SLUG[r.slug] = r; });

  // The one address in this file. Spotlight doors kept their /issue/<slug>
  // spelling through the split; what changed is that it is now a document
  // boundary rather than an in-page overlay, so this is a real navigation.
  function urlFor(slug) { return '/issue/' + encodeURIComponent(String(slug || '')); }

  window.PDXSpotlight = {
    url: urlFor,
    open: function (slug) {
      if (!slug || !BY_SLUG[slug]) return false;
      try { location.assign(urlFor(slug)); } catch (e) { location.href = urlFor(slug); }
      return true;
    },
    close: function () { /* no overlay on this document — see header */ },
    has: function (slug) { return !!(slug && BY_SLUG[slug]); },
    get: function (slug) { return BY_SLUG[slug] || null; },
    registry: BY_SLUG,
    list: function () { return ROWS.slice(); },
    strength: function (slug) { return BY_SLUG[slug] ? BY_SLUG[slug].st : null; },
    strengthFor: function (sp) {
      if (!sp) return { receipts: 0, strong: 0, sources: 0, level: 'limited', label: 'Emerging' };
      return sp.st || (BY_SLUG[sp.slug] ? BY_SLUG[sp.slug].st : null) ||
        { receipts: 0, strong: 0, sources: 0, level: 'limited', label: 'Emerging' };
    },
    forPolitician: function (id) {
      var idx = id ? BY_PERSON[id] : null;
      if (!idx || !idx.length) return [];
      return idx.map(function (i) { return ROWS[i]; }).filter(Boolean);
    },
    forIssueKey: function (key) {
      if (!key) return [];
      return ROWS.filter(function (r) {
        if (r.primaryIssueKey === key) return true;
        if ((r.communityIssueKeys || []).indexOf(key) !== -1) return true;
        if ((r.standsIssueKeys || []).indexOf(key) !== -1) return true;
        return false;
      });
    },
    // Token match over title + place + keywords, identical to the engine's.
    match: function (q) {
      q = String(q || '').toLowerCase().trim();
      if (!q) return [];
      var terms = q.split(/\s+/).filter(Boolean);
      return ROWS.filter(function (r) {
        var hay = (r.title + ' ' + r.place + ' ' + (r.searchKeywords || '')).toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      });
    }
  };
})();
