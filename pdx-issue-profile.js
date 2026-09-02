/* ─────────────────────────────────────────────────────────────────────────────
   pdx-issue-profile.js — /i/<key> is the issue file
   ─────────────────────────────────────────────────────────────────────────────
   THE ADDRESS, AND ONLY THE ADDRESS.

   The person file has had a durable address since Phase 1: /p/<pid>, a 200
   rewrite of this same document, read out of location.pathname by person-file.js.
   The issue file had none. Door 1's issue mode has painted the child ledger for
   a while — crumb, themed chips, census, bands, measures, the honesty lines —
   and seek, OPEN and a chip tap all mount it inside the desk. What none of them
   produced was a citation. There was no /i/lands_preserve, so the Eye's own
   issue hit, the person file's topic tree and a share sheet could point at a
   person, a bill or a roll call, and never at THE ISSUE.

   So this file does exactly one job and paints nothing:

     · it reads a key out of /i/<key>,
     · resolves it through the register the rest of the app resolves through
       (PDXDoor1.issueKeyFor — exact key, stemmed key, label, core, keyword),
     · hands it to the door that already exists (window.pdxDoor1Issue) and
       mounts the result in the issue file's own panel (PDXIssueFile), and
     · publishes html(key) / mount(el, key), which delegate to the SAME builder
       the desk calls: PDXDoor1.issueProfile — door1-workspace.js's
       issueProfileHtml. One function, two doors. There is no second ledger here,
       no issue-shaped page skin, and no characterisation of any kind: this file
       contains no count, no order, no percentage and no party token.

   WHAT ARRIVES IS UNTRUSTED, AND A MISS IS SAID OUT LOUD
     The segment in the bar is whatever a citation, a bookmark or a hand-typed
     phrase says. It is resolved before anything opens, and a phrase the register
     does not carry gets the honest answer in two places at once: the desk's own
     "The register carries no key for …" sentence, through the seek control that
     already owns those words, and a notice at the bottom of the viewport for a
     reader who is nowhere near the desk. Never the front page in silence, and
     never the nearest cousin key — see the resolver's own note in
     door1-workspace.js for why an ambiguous phrase resolves to nothing.

   EXACT KEY IN, EXACT KEY OUT
     An alias arrival (/i/Protect%20Public%20Lands) re-stamps the bar with the
     key it resolved to (/i/lands_preserve) and points rel=canonical at that same
     address, for the reason share-target.ts gives at length: two addresses for
     one record is what a canonical exists to collapse. The canonical is built on
     location.origin rather than on a hostname written in here, because the repo
     has exactly one public origin and exactly one place that names it
     (scripts/test-canonical-and-origin.mjs enforces both halves).

   A BUNDLE IS NOT A KEY
     One of the thirteen cores resolves here too — 'guns' is a shipped key and a
     bundle at once. The desk is the honest destination for it: a bundle has no
     single record to read, so /i/guns opens the desk's inventory and its key
     shelf and the reader picks the key they came for. html('guns') answers ''
     for the same reason, rather than merging thirteen records into one.

   AN ARRIVAL OPENS A FILE, NOT THE HOMEPAGE
     This is the pass that gave /i/ a destination. Resolving the key was never
     the defect: the arrival went through window.pdxDoor1Issue, stopped there,
     and pdxDoor1Issue's job is to paint THE DESK — so a reader who followed a
     citation was landed on the homepage, hero first, Door 1's whole chrome next,
     and the ledger they were sent to somewhere below the fold. /p/<pid> hides
     that shell and opens a file. /i/<key> does the same job now:

       · the pick still goes through window.pdxDoor1Issue — same commitment,
         same roll-call warm, same census, so the two doors are still one paint;
       · the desk's mode is selected QUIETLY first, so the desk's own open()
         cannot scroll the homepage into view. Landing on the desk was the bug;
       · and the ledger is mounted in the issue file's panel — PDXIssueFile,
         the same family as the person-file modal, covering the homepage.

     Two cases still land on the desk, and both are honest: a BUNDLE key, which
     has no single ledger to open (the reader picks a member key on the sub-key
     shelf), and a document served without the panel module, which has no stage
     to open one on. The panel says which by answering false, and this file
     falls back rather than showing an empty file.

   THE BAR, BOTH WAYS
     What this module took, it gives back. stamp() records the surface the reader
     was on before the file opened and restore() puts it back — the front door for
     a cold arrival, exactly as person-file.js answers for /p/. The panel calls
     restore() on close and never writes location itself, so there is one owner of
     the address for one address.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXIssueProfile) return;

  var PREFIX = '/i/';
  // Anchored, single segment, optional trailing slash — /i/lands_preserve and
  // /i/lands_preserve/ are the same file, and /i/lands_preserve/votes is not an
  // issue address this app claims. The segment is deliberately NOT restricted to
  // key characters: an arrival may spell the label ("Protect%20Public%20Lands")
  // and the resolver's job is to say whether that names a key. What it may not
  // contain is a slash, which is what keeps this to one segment.
  var PATH_RE = /^\/i\/([^/]+)\/?$/;

  function fn(x) { return typeof x === 'function'; }
  function desk() { return window.PDXDoor1 || null; }
  function family() { return window.PDXIssueFamily || null; }

  // ── The address ───────────────────────────────────────────────────────────
  // PDXIssueFamily owns the string, because it already owns every other answer
  // about a child key (its parent, its label, its crumb) and one owner is the
  // whole point of that module. The literal below is a fallback for a document
  // served without it, and it is the same literal — asserted equal by
  // scripts/test-issue-file-address.mjs so the two cannot drift.
  function path(key) {
    var k = String(key == null ? '' : key).trim();
    if (!k) return '';
    var F = family();
    if (F && fn(F.profileUrl)) {
      try {
        var u = F.profileUrl(k);
        if (u) return u;
      } catch (e) {}
    }
    // Trimmed and nothing else, which is exactly what norm() does over there. A
    // fallback that also lower-cased would answer a different address from the
    // owner for the same input, and the whole point of a fallback is that a
    // reader cannot tell which one answered.
    return PREFIX + encodeURIComponent(k);
  }
  function origin() {
    try { return location.origin; } catch (e) { return ''; }
  }
  function url(key) {
    var p = path(key);
    return p ? (origin() + p) : '';
  }

  // ── The key an address names ──────────────────────────────────────────────
  function fromPath(p) {
    try {
      var m = String(p == null ? location.pathname : p).match(PATH_RE);
      if (!m) return '';
      try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
    } catch (e) { return ''; }
  }
  // ONE RESOLVER, AND IT IS THE DESK'S. The Eye asks the same question, the
  // typeahead asks the same question, and an address in the bar has to get the
  // same answer or a reader follows a citation to something else. Nothing is
  // re-implemented here: no stemming, no keyword table, no nearest-label guess.
  function resolve(raw) {
    var q = String(raw == null ? '' : raw).trim();
    if (!q) return '';
    var D = desk();
    if (!D || !fn(D.issueKeyFor)) return '';
    try { return D.issueKeyFor(q) || ''; } catch (e) { return ''; }
  }

  // ── The paint, borrowed whole ─────────────────────────────────────────────
  // door1-workspace.js's issueProfileHtml. Not a copy of it, not a reduced
  // version of it: the export. A caller that gets '' has been told that this key
  // has no single ledger at this address (a bundle), or that the desk module is
  // not on the page — never that the record is empty, which is a claim only the
  // ledger itself is allowed to make.
  function html(key) {
    var D = desk();
    if (!D || !fn(D.issueProfile)) return '';
    try { return D.issueProfile(key) || ''; } catch (e) { return ''; }
  }
  function mount(el, key) {
    if (!el) return false;
    var body = html(key);
    if (!body) return false;
    try { el.innerHTML = body; } catch (e) { return false; }
    return true;
  }

  // ── The bar, and the one canonical ────────────────────────────────────────
  // WHAT THE READER WAS ON BEFORE THE FILE OPENED. Captured once per open rather
  // than per stamp, so an alias arrival that re-stamps itself with the exact key
  // still returns to the surface it was opened from. Same shape, same reasoning
  // and the same cold-arrival answer as person-file.js's own: re-capturing the
  // /i/ path we are about to rewrite would make close a no-op that leaves a
  // closed issue's address in the bar, so a cold arrival returns to the front
  // door.
  var _return = null;
  // The tab's way home. index.html is where this string is spelled and
  // person-file.js is the only other place; read live where that is safe, so the
  // two cannot drift, and pinned to the literal when this document arrived on an
  // issue address — reading the live title THERE would risk capturing a title
  // written for the file as if it were the front page's, which is the defect
  // person-file.js documents at length for /p/.
  var HOME_TITLE = 'PolitiDex | Bound by Truth';
  var _homeTitle = (function () {
    try {
      if (!fromPath(location.pathname) && document.title) return String(document.title);
    } catch (e) {}
    return HOME_TITLE;
  })();

  function stamp(key) {
    var p = path(key);
    if (!p) return false;
    try {
      if (_return === null) {
        _return = fromPath(location.pathname)
          ? '/'
          : location.pathname + (location.search || '');
      }
    } catch (e) {}
    try {
      if (location.pathname !== p) {
        history.replaceState(null, '', p + (location.search || '') + (location.hash || ''));
      }
    } catch (e) {}
    // index.html ships ONE canonical href for the whole single-page app, so an
    // /i/ arrival that left it alone would be telling anything reading the live
    // DOM that this ledger is really the homepage. Same fix the Spotlight makes
    // for its own address, made here for this one.
    try {
      var link = document.querySelector('link[rel="canonical"]');
      if (link) link.setAttribute('href', url(key));
    } catch (e) {}
    return true;
  }
  // The tab, in the words the register already uses for this key. A label, a
  // lane and the brand — no count, no verdict, no direction word.
  function title(key) {
    var D = desk();
    var label = key;
    try { if (D && fn(D.issueLabelFor)) label = D.issueLabelFor(key) || key; } catch (e) {}
    return label + ' — the formal record · PolitiDex';
  }

  // ── The honest miss ───────────────────────────────────────────────────────
  // Two surfaces, one sentence each, and neither of them invents a key. The
  // desk's seek control already owns the wording for a phrase the register does
  // not carry, so it is asked to say it rather than paraphrased here; the notice
  // exists because the desk is a long way down the page and a reader who
  // followed a citation is owed the answer where they landed.
  function missed(raw) {
    var D = desk();
    try { if (D && fn(D._seek)) D._seek(raw); } catch (e) {}
    try { if (D && fn(D.open)) D.open('issue'); } catch (e) {}
    try {
      var L = window.PDXShareLinks;
      if (L && fn(L.notice)) {
        L.notice('pdx-issue-unresolved', 'Issue file',
          'We couldn’t open the issue that link named. Rather than quietly show you ' +
          'the front page, here’s the plain answer: “' + raw + '” is not a key the ' +
          'register carries. Nothing was approximated.');
      }
    } catch (e) {}
    return false;
  }

  // ── Giving the bar back ───────────────────────────────────────────────────
  // The panel's close calls this, and it is here rather than there for the same
  // reason person-file.js owns /p/'s restore: this module is what changed the
  // address, and /i/<key> is a PATH — "drop the query string" would leave the
  // closed issue's address in the bar. The tab goes home with it, and the
  // canonical stops claiming the front page is this ledger.
  //
  // Nothing captured means a cold deep link straight onto /i/<key>, and the
  // honest destination for that is the front door — not an issue we just closed.
  function restore() {
    try { document.title = _homeTitle; } catch (e) {}
    try {
      var link = document.querySelector('link[rel="canonical"]');
      if (link) link.setAttribute('href', origin() + '/');
    } catch (e) {}
    try {
      var back = _return;
      _return = null;
      history.replaceState(null, '', (back == null ? '/' : back) + (location.hash || ''));
    } catch (e) {}
    return true;
  }

  // ── The arrival ───────────────────────────────────────────────────────────
  // Returns the key it opened, or '' — including when the address names no key,
  // which is reported rather than swallowed. The open itself goes through
  // window.pdxDoor1Issue, which is the SAME entry point a chip tap and the seek
  // control use: same pick recorded, same roll-call warm, same ledger. That is
  // what makes "the numbers at /i/<key>" and "the numbers on the desk" the same
  // numbers by construction rather than by agreement.
  function adopt() {
    var raw = fromPath();
    if (!raw) return '';
    var key = resolve(raw);
    if (!key) { missed(raw); return ''; }
    var opened = false;
    try {
      // THE MODE, QUIETLY, FIRST. pdxDoor1Issue routes through the desk's own
      // open() when the mode has to change, and that open() scrolls the desk
      // into view — which is precisely how an /i/ arrival used to end up looking
      // at the homepage. Selecting the mode with {quiet:true} beforehand means
      // the pick below finds the mode already set and only re-syncs, so the
      // commitment, the warm and the census are identical and the page does not
      // move under the reader.
      var D = desk();
      if (D && fn(D.open)) D.open('issue', { quiet: true });
      opened = !!(fn(window.pdxDoor1Issue) && window.pdxDoor1Issue(key));
    } catch (e) { opened = false; }
    stamp(key);
    try { document.title = title(key); } catch (e) {}
    // THE FILE. The same string the desk just painted, mounted on a stage that
    // covers the homepage — see AN ARRIVAL OPENS A FILE. The panel answers false
    // for a bundle key and for a document served without it, and both of those
    // land on the desk instead, which is the honest destination for each.
    var filed = false;
    try {
      var P = window.PDXIssueFile;
      filed = !!(P && fn(P.open) && P.open(key));
    } catch (e) { filed = false; }
    if (!filed) {
      try { if (opened && desk() && fn(desk().toDesk)) desk().toDesk('issue'); } catch (e) {}
    }
    return key;
  }

  // ── THE WAIT ──────────────────────────────────────────────────────────────
  // ISSUE_MAP and CORE_NATIONAL_ISSUES come from alignment-tool.js, a deferred
  // script, and PDXDoor1 from another one. A macrotask scheduled here cannot run
  // until every remaining deferred script has executed, which is the reason
  // person-file.js kicks the same way — so by the time this runs the register is
  // normally in hand. Normally is not always: alignment-tool.js is also allowed
  // to REPLACE that array later, which is why pdx-issue-family.js and
  // issue-colors.js both read it live. So a first attempt that finds no resolver
  // and no key retries on a short, bounded schedule, and only then says the
  // register carries nothing by that name. Saying it earlier would be a claim
  // about a module that had not loaded yet.
  var CEILING = 4000, STEP = 120, STEP_MAX = 600, STEP_GROW = 1.5;
  var _settled = false;

  function ready() {
    var D = desk();
    if (!D || !fn(D.issueKeyFor)) return false;
    try { return (D.trackedKeys() || []).length > 0; } catch (e) { return false; }
  }
  function attempt(raw, waited, tries) {
    if (_settled) return;
    // The reader moved on, or something else opened a file. Either way the
    // arrival is no longer the thing deciding what is on screen.
    if (fromPath() !== raw) { _settled = true; return; }
    if (ready() || waited >= CEILING) {
      _settled = true;
      try { adopt(); } catch (e) {}
      return;
    }
    var gap = Math.min(STEP_MAX, Math.round(STEP * Math.pow(STEP_GROW, tries || 0)));
    try { setTimeout(function () { attempt(raw, waited + gap, (tries || 0) + 1); }, gap); }
    catch (e) { _settled = true; }
  }
  function bootAdopt() {
    var raw = fromPath();
    if (!raw) return '';
    _settled = false;
    attempt(raw, 0, 0);
    return raw;
  }

  window.PDXIssueProfile = {
    PREFIX: PREFIX,
    PATH_RE: PATH_RE,
    path: path,
    url: url,
    fromPath: fromPath,
    resolve: resolve,
    // The one builder, borrowed from the desk. Named html()/mount() because that
    // is what they are — a string and a place to put it — and because a name
    // like render() would suggest this file decides something about the content.
    html: html,
    mount: mount,
    stamp: stamp,
    restore: restore,
    title: title,
    adopt: adopt,
    bootAdopt: bootAdopt,
    _ready: ready
  };

  if (fromPath()) {
    var _kicked = false;
    var kick = function () { if (_kicked) return; _kicked = true; bootAdopt(); };
    try { setTimeout(kick, 0); } catch (e) {}
    try { window.addEventListener('load', kick); } catch (e) {}
  }

  // Back/forward across issue files. Popping to /i/<other> reads that other key
  // through the one door; popping OFF an issue path now means something, because
  // there is a file open over the page to dismiss — the same answer person-file.js
  // gives when a pop leaves /p/. The address is left exactly where the reader's
  // own navigation put it (keepAddress), because restoring it here would fight
  // the button they just pressed.
  try {
    window.addEventListener('popstate', function () {
      try {
        if (fromPath()) { _settled = true; adopt(); return; }
        var P = window.PDXIssueFile;
        if (P && fn(P.isOpen) && P.isOpen()) P.close({ keepAddress: true });
      } catch (e) {}
    });
  } catch (e) {}
})();
