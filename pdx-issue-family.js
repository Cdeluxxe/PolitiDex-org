/* ─────────────────────────────────────────────────────────────────────────────
   PolitiDex — the issue family table  ·  window.PDXIssueFamily
   ─────────────────────────────────────────────────────────────────────────────
   ONE FAMILY, ONE TABLE. An issue has exactly two levels on this site and this
   file is the only place either of them is decided:

     · a CORE is a table of contents. Thirteen of them, ordered by 2026 salience,
       declared in CORE_NATIONAL_ISSUES (alignment-tool.js) next to ISSUE_MAP
       itself. A core is a place to browse from. It is not a reading, it has no
       record of its own, and nothing on this site characterises a person "on" a
       core — see the inventory sentence on the Door 1 desk.
     · a CHILD is an ISSUE_MAP key, and the child IS the issue profile. Its
       record ledger — census, bands, mapped measures — already shipped and is
       read by exact key through PDXConsistency.formalPatternIndex.rowFor(pid,
       key). Nothing here re-reads a record or produces a figure.

   WHY THIS FILE EXISTS. Three surfaces grouped issues into families and only one
   of them read the table: the Door 1 issue shelf (core bundles), the person
   file's topic tree (its own grouping) and the seek control (the whole
   register). The gap between them was visible: `lands_preserve` is a shipped key
   with a label, a chip and four mapped measures, and it had a ledger you could
   open by typing its name and no chip on any branch, because no core listed it.
   Twenty-four keys were in that position. The fix was NOT a second taxonomy —
   the register already had one owner. It was to finish the one that exists
   (every published key now has exactly one parent, enforced by
   scripts/test-issue-family.mjs) and to give every surface a single place to ask.

   WHAT THIS FILE MAY AND MAY NOT DO
     · MAY: name a parent, list children in display order, print a crumb.
     · MAY NOT: merge two keys, rename a key, invent a key, order people, count
       anything about a person, or return a percentage. There is no number in
       this file's output except a length.

   READS, ALL FOUR PURE
     PDXIssueFamily.coreOf(key)        → coreId, or '' when the key is off-register
     PDXIssueFamily.childrenOf(coreId) → published child keys, in display order
     PDXIssueFamily.label(coreId)      → the core's own label, as declared
     PDXIssueFamily.crumb(key)         → { coreLabel, childLabel, text } —
                                         "Core label → Child label"
   Plus the audit reads the tests hang on — orphans(), duplicates() — and
   profileUrl(key), which is the child's ADDRESS: /i/<key>, root-anchored and
   host-free. It stopped being a naming hook in September 2026, when /i/* became a
   served path — but it is still only an address. No chip, crumb or ledger is
   gated on it, and this file routes nothing itself.

   THE TABLE IS READ LIVE, never copied. CORE_NATIONAL_ISSUES loads async on some
   entry points, so the index is built on first use and rebuilt if that array is
   ever replaced — the same arrangement issue-colors.js uses for the same reason.
   A caller that arrives before alignment-tool.js gets '' / [] and every consumer
   is guarded, so a missing table degrades to "no family known" rather than to a
   wrong family.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.PDXIssueFamily) return;

  function coreList() {
    try {
      var l = window.CORE_NATIONAL_ISSUES;
      return (Object.prototype.toString.call(l) === '[object Array]') ? l : null;
    } catch (e) { return null; }
  }
  function issueMap() {
    try {
      var m = window.ISSUE_MAP;
      return (m && typeof m === 'object') ? m : null;
    } catch (e) { return null; }
  }
  // PUBLISHED means the register gives the key a name a reader can see. A key
  // with no label is scaffolding, not an issue, and it is not owed a parent.
  function published(key) {
    var m = issueMap();
    var e = m && key ? m[key] : null;
    return !!(e && e.label);
  }
  function norm(k) { return (typeof k === 'string') ? k.trim() : ''; }

  // ── THE INDEX ───────────────────────────────────────────────────────────────
  // Two directions off one source: child → parent, and parent → children in the
  // order the table declares them (which is the order the chips paint in, so the
  // shelf cannot reshuffle between two renders of the same data). `dupes` is kept
  // rather than silently resolved: a key claimed by two cores is a bug in the
  // table and a test failure, and the first-wins fallback below is only so a
  // surface keeps working while that test is red.
  var _cache = null, _src = null, _mapSrc = null;
  function index() {
    var list = coreList();
    if (!list) return null;
    var m = issueMap();
    if (_cache && _src === list && _mapSrc === m) return _cache;
    var parent = Object.create(null);
    var kids = Object.create(null);
    var order = [];
    var meta = Object.create(null);
    var dupes = [];
    list.forEach(function (c) {
      if (!c || !c.key) return;
      var id = norm(c.key);
      if (!id || meta[id]) return;
      order.push(id);
      meta[id] = { id: id, label: c.label || id, blurb: c.blurb || '', obj: c };
      kids[id] = [];
      (c.keys || []).forEach(function (k) {
        var key = norm(k);
        if (!key) return;
        if (parent[key] && parent[key] !== id) { dupes.push(key); return; }
        if (!parent[key]) parent[key] = id;
        if (kids[id].indexOf(key) < 0) kids[id].push(key);
      });
    });
    _cache = { parent: parent, kids: kids, order: order, meta: meta, dupes: dupes };
    _src = list; _mapSrc = m;
    return _cache;
  }

  function coreOf(key) {
    var i = index();
    var k = norm(key);
    if (!i || !k) return '';
    return i.parent[k] || '';
  }
  function isCore(id) {
    var i = index();
    var k = norm(id);
    return !!(i && k && i.meta[k]);
  }
  // Children are filtered to PUBLISHED keys, because a chip is a promise that
  // there is something behind it and an unlabelled key has no face to print.
  // Where ISSUE_MAP has not loaded, the declared order is returned unfiltered —
  // a shelf that waits for the register is a shelf that renders empty.
  function childrenOf(coreId) {
    var i = index();
    var k = norm(coreId);
    if (!i || !k || !i.kids[k]) return [];
    var all = i.kids[k].slice();
    if (!issueMap()) return all;
    return all.filter(published);
  }
  function label(coreId) {
    var i = index();
    var k = norm(coreId);
    return (i && k && i.meta[k]) ? String(i.meta[k].label) : '';
  }
  function blurb(coreId) {
    var i = index();
    var k = norm(coreId);
    return (i && k && i.meta[k]) ? String(i.meta[k].blurb) : '';
  }
  // The core's own declared object, for the shipped callers that pass a bundle
  // into issue-view.js's buildRanking. Handed over rather than rebuilt, so the
  // desk and this table can never disagree about what a bundle contains.
  function coreObject(coreId) {
    var i = index();
    var k = norm(coreId);
    return (i && k && i.meta[k]) ? i.meta[k].obj : null;
  }
  function cores() {
    var i = index();
    if (!i) return [];
    return i.order.map(function (id) {
      return { id: id, key: id, label: i.meta[id].label, blurb: i.meta[id].blurb };
    });
  }
  function childLabel(key) {
    var m = issueMap();
    var e = m && key ? m[norm(key)] : null;
    return (e && e.label) ? String(e.label) : norm(key);
  }

  // ── THE CRUMB ───────────────────────────────────────────────────────────────
  // Two labels and an arrow: the family a reader is inside, then the issue they
  // are actually reading. Printed under the census on the Door 1 ledger so the
  // pane never leaves a reader guessing which family a key belongs to — the exact
  // confusion that made `lands_preserve` feel like a fourteenth topic. It is
  // copy: no count, no share, no order.
  var ARROW = ' → ';
  function crumb(key) {
    var k = norm(key);
    if (!k) return null;
    var id = coreOf(k);
    var cl = label(id);
    var kl = childLabel(k);
    if (!kl) return null;
    return {
      core: id,
      coreLabel: cl,
      child: k,
      childLabel: kl,
      text: cl ? (cl + ARROW + kl) : kl
    };
  }

  // ── THE AUDIT READS ─────────────────────────────────────────────────────────
  // Published keys with no parent, and keys two cores claim. Both are meant to
  // be empty forever; they are exported because a rule nothing can check is a
  // rule that quietly stops being true.
  function orphans() {
    var m = issueMap();
    if (!m) return [];
    var out = [];
    Object.keys(m).forEach(function (k) {
      if (published(k) && !coreOf(k)) out.push(k);
    });
    return out.sort();
  }
  function duplicates() {
    var i = index();
    if (!i) return [];
    var seen = Object.create(null), out = [];
    i.dupes.forEach(function (k) { if (!seen[k]) { seen[k] = 1; out.push(k); } });
    return out.sort();
  }
  function publishedKeys() {
    var m = issueMap();
    if (!m) return [];
    return Object.keys(m).filter(published).sort();
  }

  // ── THE CHILD'S OWN ADDRESS, AND IT IS ROUTED NOW ─────────────────────────
  // This used to return '#issue=<key>' and say, at length, that it was a naming
  // hook nothing routed. It is routed: netlify.toml serves /i/* as this document
  // (a 200 rewrite, the same arrangement /p/<pid> has), pdx-issue-profile.js
  // reads the key out of location.pathname and mounts the ledger, and
  // door1-workspace.js's issueProfileHtml(key) is the one builder both doors use.
  //
  // ROOT-ANCHORED, WITHOUT A HOST. The app is served from several paths that all
  // rewrite to the same document, so an address built by pasting onto "wherever
  // the reader happens to be" inherits a prefix that means something else — and a
  // host written in here would be the wrong half of that decision anyway: the
  // repo has exactly one public origin and one place that names it, which
  // scripts/test-canonical-and-origin.mjs enforces. PDXIssueProfile.url(key)
  // puts location.origin in front of this when an absolute form is wanted.
  //
  // THE KEY IS NOT RE-SPELT. norm() lower-cases and trims, which is what every
  // other read in this file does; it does not stem, alias, guess or reparent. A
  // key with no name in the register still gets its own address, because the
  // register is what decides that and this file does not overrule it.
  function profileUrl(key) {
    var k = norm(key);
    return k ? ('/i/' + encodeURIComponent(k)) : '';
  }

  window.PDXIssueFamily = {
    ARROW: ARROW,
    cores: cores,
    isCore: isCore,
    coreOf: coreOf,
    childrenOf: childrenOf,
    label: label,
    blurb: blurb,
    childLabel: childLabel,
    crumb: crumb,
    coreObject: coreObject,
    published: published,
    publishedKeys: publishedKeys,
    orphans: orphans,
    duplicates: duplicates,
    profileUrl: profileUrl
  };
})();
