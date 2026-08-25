/* ═══════════════════════════════════════════════════════════════════════════
   person-file.js — the politician profile as ONE object with ONE address
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS BROKEN

   The profile was never short of content, and after profile-spine.js it was not
   short of sequence either. What it lacked was IDENTITY as a thing you can be
   inside of and link to.

   Six surfaces opened a person, and each did it its own way. Search and the
   listing cards called showProfile(). The medium quick-view called
   openMediumModal() and handed off through _mediumViewFull(). The Direction
   Match cards called their own openProfile() in hero-showcase.js, which called
   showProfile and then jumped. issue-compare.js wrapped showProfile behind its
   own openProfile adapter. Each of those was correct in isolation and none of
   them agreed on what "opening a person" meant, so nothing could be added to
   the act of opening a person without being added five times — and nothing
   could be relied on either, because the paths were only equivalent by
   coincidence.

   The address was the sharper problem. A person file lived at /?p=<id>: a query
   parameter on the homepage. That works, and it reads as a homepage with an
   argument, not as a record. It cannot be cited in a footnote without looking
   like a tracking link, an edge function cannot see a person in it without
   parsing the query string, and it is not a shape you can put in a sitemap and
   feel good about.

   WHAT THIS FILE IS

   The one funnel, and the one address.

     PDXPerson.open(pid, opts)   every path into a person file, including the
                                 ones that used to call showProfile directly —
                                 they still can, and showProfile now routes here
     PDXPerson.url(pid)          https://<origin>/p/<pid> — the durable form
     PDXPerson.stamp(pid)        put that address in the bar while the file is open
     PDXPerson.restore()         put back whatever the reader was on before
     PDXPerson.fromPath()        read a person out of location.pathname
     PDXPerson.adopt()           open the person named by the current URL

   WHY /p/<pid> AND NOT A NAME SLUG

   Because a name in a URL is a claim nothing on arrival can check, and because
   two people share a name more often than anyone designing a slug table expects.
   The pid is what the roster, the stance corpus, the voting-record API and every
   share link already agree on, and it is already URL-shaped — every id in the
   roster is [a-z0-9_]+, pinned by PDXPublicationFloor.PID_RE and by
   scripts/test-person-file.mjs. So /p/celeste_maloy is not prettier than a slug;
   it is the id the whole app already resolves, spelled out where a reader can
   see it.

   The old /?p=<id> form is NOT retired. Every link of that shape already in the
   wild keeps working: _pdxOpenFromUrl in profiles-full.js still reads it, and
   this module only changes what the bar shows once a file is open and what new
   links are built as. One address is canonical; the other still resolves.

   THE RULES THIS FILE KEEPS

   · IT OPENS, IT DOES NOT RENDER. Not one fact about a person is computed here.
     The file is drawn by profiles-full.js in the stage order profile-spine.js
     declares; this module decides only that you are in it, and where "it" is.

   · NO SECOND SCORE, AND NO DIRECTION MATCH IN THE CHROME. The file kicker
     carries identity and an address. It carries no figure of any kind — the
     formal record leads the file itself, and Word vs Action stays the narrow
     secondary read it is inside the body.

   · AN ADDRESS IS ONLY ADVERTISED IF IT IS WORTH ARRIVING AT. The kicker prints
     the citable URL only for a record that clears PDXPublicationFloor, the same
     rule the sitemap is generated from. Below the floor it says the record is
     still being built — the app's own existing words for that state — rather
     than handing out a link to a page that will say so on arrival.

   · IT NEVER TRAPS THE READER SOMEWHERE ELSE. The app answers on /, /issue/…,
     /vote/… and now /p/…, so stamping an address has to be reversible. The path
     in the bar when the file opened is remembered and put back on close, which
     is why a profile opened from an Issue Spotlight returns to that spotlight's
     address instead of to the front page.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXPerson) return;

  var PREFIX = '/p/';
  // Matches the path form and nothing else. Anchored, single segment, optional
  // trailing slash — /p/celeste_maloy and /p/celeste_maloy/ are the same file,
  // and /p/celeste_maloy/votes is not a person address this app claims.
  var PATH_RE = /^\/p\/([A-Za-z0-9_]+)\/?$/;

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function fn(x) { return typeof x === 'function'; }
  function floor() { return window.PDXPublicationFloor || null; }

  // ── The record behind a pid ───────────────────────────────────────────────
  // Both rosters, in the order the rest of the app reads them: the live one
  // first (PROFILES, hydrated from Firestore) then the bundled index (CMP_DATA).
  // Returns null rather than an empty object so callers can tell "no such
  // person" from "person with blank fields".
  function record(pid) {
    if (!pid) return null;
    try {
      if (window.PROFILES && window.PROFILES[pid]) return window.PROFILES[pid];
    } catch (e) {}
    try {
      if (window.CMP_DATA && window.CMP_DATA[pid]) return window.CMP_DATA[pid];
    } catch (e) {}
    return null;
  }

  function origin() {
    try { return location.origin; } catch (e) { return ''; }
  }

  // ── The address ───────────────────────────────────────────────────────────
  // Root-anchored, for the reason share-links.js gives at length: the app is
  // served from several paths that all rewrite to the same document, so a URL
  // built by pasting onto "wherever the reader happens to be" inherits an
  // address that means something else.
  function url(pid) {
    if (!pid) return '';
    return origin() + PREFIX + encodeURIComponent(pid);
  }
  function path(pid) {
    if (!pid) return '';
    return PREFIX + encodeURIComponent(pid);
  }

  function fromPath(p) {
    try {
      var m = String(p == null ? location.pathname : p).match(PATH_RE);
      return m ? m[1] : '';
    } catch (e) { return ''; }
  }

  // Every way a URL can name a person, newest first. The query form is second
  // rather than gone: links of that shape are already in the wild.
  function fromUrl() {
    var viaPath = fromPath();
    if (viaPath) return viaPath;
    try { return new URLSearchParams(location.search).get('p') || ''; }
    catch (e) { return ''; }
  }

  // ── The bar ───────────────────────────────────────────────────────────────
  // What the reader was on before any file opened. Captured once per open, not
  // per stamp, so a hop from one person file straight to another still returns
  // to the surface the first one was opened from.
  var _return = null;

  function stamp(pid) {
    if (!pid) return;
    try {
      if (_return === null) _return = location.pathname + location.search;
      // The hash is a section within the app and survives; the ?p= param does
      // not, because the path now carries what it used to.
      var search = '';
      try {
        var q = new URLSearchParams(location.search);
        q.delete('p');
        var s = q.toString();
        search = s ? '?' + s : '';
      } catch (e) { search = ''; }
      history.replaceState(null, '', path(pid) + search + location.hash);
    } catch (e) {}
  }

  function restore() {
    try {
      var back = _return;
      _return = null;
      if (back == null) {
        // Nothing captured (a cold deep link straight onto /p/<pid>): the
        // honest destination is the front door, not a person we just closed.
        history.replaceState(null, '', '/' + location.hash);
        return;
      }
      history.replaceState(null, '', back + location.hash);
    } catch (e) {}
  }

  // ── The file kicker ───────────────────────────────────────────────────────
  // One line in the modal's sticky top bar, above the name that is already
  // there: what this surface is, and — when the record clears the floor — the
  // address it can be cited at. It is the answer to "am I still in this
  // person's file, and which one", which is the question a reader four modals
  // deep cannot otherwise answer.
  //
  // It states no finding. There is no figure, no verdict and no Direction Match
  // in this element, deliberately: the moment the chrome carries a number, the
  // number is the headline, and the formal record inside the file is not.
  function kicker(pid) {
    var host = document.getElementById('modal-file-kicker');
    if (!host) return;
    var d = record(pid);
    if (!pid || !d) { host.innerHTML = ''; host.removeAttribute('data-pid'); return; }
    host.setAttribute('data-pid', pid);

    var F = floor();
    var ok = F && fn(F.clears) ? F.clears(pid) : false;
    var addr = String(url(pid)).replace(/^https?:\/\//, '');

    host.innerHTML =
      '<span class="pf-kick-what">Person file</span>' +
      (ok
        ? '<a class="pf-kick-addr" href="' + esc(path(pid)) + '"' +
            ' title="This record has a citable address — copy it, or open it in a new tab"' +
            ' onclick="return window.PDXPerson.kickerClick(event);">' + esc(addr) + '</a>'
        : '<span class="pf-kick-thin" title="A citable address is published once a record ' +
            'has at least two cited positions. This one is still being built, so we do not ' +
            'advertise one for it yet.">record still being built</span>');
  }

  // The address in the kicker is a real anchor so it can be copied, opened in a
  // new tab, and read by anything that scrapes links. A plain click, though,
  // would reload the document to arrive at the file that is already open — so a
  // plain click just re-stamps. Modified clicks (new tab, new window) fall
  // through to the browser untouched.
  function kickerClick(ev) {
    try {
      if (ev && (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button === 1)) return true;
      if (ev && ev.preventDefault) ev.preventDefault();
      var host = document.getElementById('modal-file-kicker');
      var pid = host && host.getAttribute('data-pid');
      if (pid) stamp(pid);
    } catch (e) {}
    return false;
  }

  // ── The one way in ────────────────────────────────────────────────────────
  // Everything that opens a person calls this. It resolves the record, opens
  // the file through the renderer that owns it, stamps the address, sets the
  // kicker, and optionally jumps to a section inside the file.
  //
  // `opts.section` is an anchor id inside the file (the same ids
  // _pdxNavJump takes), which is how a Direction Match card can land on the
  // record section that produced it instead of the top of the file — the
  // behaviour hero-showcase.js implemented privately and now delegates.
  function open(pid, opts) {
    opts = opts || {};
    if (opts.event && fn(opts.event.stopPropagation)) opts.event.stopPropagation();
    pid = pid ? String(pid) : '';
    if (!pid) return false;

    // The renderer. _pdxOpenFullModal is the internal name; showProfile is the
    // public one and does the journey bookkeeping, so it is preferred — but
    // showProfile routes back here, so calling it would loop. The flag breaks
    // that: showProfile sets it, meaning "the funnel already ran".
    var opened = false;
    try {
      if (fn(window.openModal)) { window.openModal(pid); opened = true; }
      else if (fn(window._pdxOpenFullProfileModal)) { window._pdxOpenFullProfileModal(pid); opened = true; }
    } catch (e) {}
    if (!opened) return false;

    // Neither of these may take the open down with them. The modal is already
    // on screen by this point: a reader who can see the file but whose address
    // bar did not update has a cosmetic problem, whereas a throw here would
    // leave them looking at a half-opened overlay.
    try { stamp(pid); } catch (e) {}
    try { kicker(pid); } catch (e) {}

    if (opts.section && fn(window._pdxNavJump)) {
      // The file must be in the DOM before anything can scroll inside it. Same
      // deferral receipt-cards.js and hero-showcase.js already used.
      setTimeout(function () {
        try { window._pdxNavJump(opts.section); } catch (e) {}
      }, 250);
    }
    return true;
  }

  // Open whatever person the current URL names. Returns the pid it opened, or
  // '' — including when the URL names someone the roster does not carry, which
  // is reported rather than swallowed, the same way _pdxOpenFromUrl reports it.
  function adopt() {
    var pid = fromUrl();
    if (!pid) return '';
    if (!record(pid)) {
      try {
        var L = window.PDXShareLinks;
        if (L && fn(L.notice)) {
          L.notice('pdx-person-unresolved', 'Person file',
            'We couldn’t open the record that link named. Rather than quietly show ' +
            'you the front page, here’s the plain answer: “' + pid + '” isn’t ' +
            'someone we currently carry a record for.');
        }
      } catch (e) {}
      return '';
    }
    return open(pid) ? pid : '';
  }

  window.PDXPerson = {
    PREFIX: PREFIX,
    PATH_RE: PATH_RE,
    open: open,
    url: url,
    path: path,
    stamp: stamp,
    restore: restore,
    kicker: kicker,
    kickerClick: kickerClick,
    fromPath: fromPath,
    fromUrl: fromUrl,
    adopt: adopt,
    record: record,
    publishable: function (pid) {
      var F = floor();
      return !!(F && fn(F.clears) && F.clears(pid));
    }
  };

  // ── Cold deep link ────────────────────────────────────────────────────────
  // /p/<pid> is served by a netlify.toml rewrite, so the document that arrives
  // is the same index.html the front page is. Nothing in it knows a person was
  // asked for until this runs. Deferred past the roster build for the same
  // reason _pdxOpenFromUrl is: PROFILES and CMP_DATA are populated by deferred
  // scripts, and a file opened before them renders empty.
  function bootAdopt() {
    if (!fromPath()) return;   // ?p= is still owned by _pdxOpenFromUrl
    setTimeout(function () { try { adopt(); } catch (e) {} }, 420);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAdopt);
  } else {
    bootAdopt();
  }

  // Back/forward across person files. The path form makes this meaningful for
  // the first time: popping to /p/<other> should show that other file, and
  // popping off a person path should close the file rather than leave a stale
  // one open under a URL that no longer names it.
  window.addEventListener('popstate', function () {
    try {
      var pid = fromPath();
      var openNow = window._pdxCurrentProfileId || '';
      if (pid && pid !== openNow) { open(pid); return; }
      if (!pid && openNow && fn(window.closeModal)) window.closeModal();
    } catch (e) {}
  });
})();
