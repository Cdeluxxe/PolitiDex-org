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
     PDXPerson.resolve(pid)      the roster id an arriving pid means, or ''
     PDXPerson.adopt()           open the person named by the current URL
     PDXPerson.bootAdopt()       wait for the roster, then adopt a cold /p/<pid>

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
     address instead of to the front page. A COLD arrival straight onto /p/<pid>
     is the one case with no earlier surface to remember, and it returns to the
     front door rather than to the address of the file it just closed.

   · AN ARRIVAL IS UNTRUSTED INPUT, AND A SLOW ROSTER IS NOT AN ANSWER. The id
     in the bar is whatever a citation, a bookmark or a hand-typed name says, so
     it is resolved through the app's own alias tables before anything opens
     (resolve(), below) — and the resolution is retried until the roster reports
     it has finished loading, because "we don't carry that person" said while the
     roster is still in flight is a lie about a record that exists.
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

  // ── The record an arriving pid MEANS ──────────────────────────────────────
  // record() answers "is there a record filed under exactly this id". That is
  // the right question for the app's own calls, where the id came out of the
  // roster in the first place. It is the wrong question for an id that arrived
  // in the ADDRESS BAR, which is where /p/mike_lee came from: a citation, a
  // bookmark, a link minted by an older build, or a name typed by hand. The
  // roster files Mike Lee under `lee`; `mike_lee` is the display-name spelling
  // of the same person, and the repo already says so in two places
  // (stance-helpers.js STANCE_ALIASES, and every name-slug bridge in
  // PDX_PROFILE_ALIAS).
  //
  // Every in-app door already closes that gap: openModal() resolves through
  // PDXProfilePid() before it looks anything up, which is why `kivory` and
  // `ray_ward` open from a card. The arrival path did not, so /p/<alias> was
  // the one door in the app that could not open a person the rest of it opens
  // fine — it failed closed at the record() gate and never reached the renderer
  // that would have resolved it.
  //
  // Three steps, each reading a table the repo already keeps, none of them
  // inventing an identity:
  //   1 · PDXProfilePid — the app's own alias tables (PDX_PROFILE_ALIAS, ACCT_ALIAS)
  //   2 · case — an address that came back through something that lower-cased it
  //   3 · the display-name slug, the same convention PDX_PROFILE_ALIAS's own
  //       stance bridges use (`bridger_bolinder` → `bolinder_h68`), accepted
  //       ONLY when exactly one record answers to it. Two people share a name
  //       more often than a slug table expects, so an ambiguous name resolves to
  //       nothing rather than to a coin flip.
  function slug(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  // '' for no match AND for an ambiguous one — a name that two records answer to
  // is not an address, so it does not get to pick one of them.
  var AMBIGUOUS = '\u0000';
  function bySlug(pid) {
    var want = slug(pid);
    if (!want) return '';
    var hit = '';
    function scan(roster) {
      if (!roster || hit === AMBIGUOUS) return;
      for (var id in roster) {
        if (!Object.prototype.hasOwnProperty.call(roster, id)) continue;
        var rec = roster[id];
        if (!rec || slug(rec.name) !== want) continue;
        if (hit && hit !== id) { hit = AMBIGUOUS; return; }
        hit = id;
      }
    }
    try { scan(window.PROFILES); } catch (e) {}
    try { scan(window.CMP_DATA); } catch (e) {}
    return hit === AMBIGUOUS ? '' : hit;
  }

  // The roster id for whatever a caller (or a URL) named, or '' when nothing in
  // either roster answers to it. Never throws, and never guesses.
  function resolve(pid) {
    pid = pid ? String(pid) : '';
    if (!pid) return '';
    if (record(pid)) return pid;
    try {
      if (fn(window.PDXProfilePid)) {
        var aliased = window.PDXProfilePid(pid);
        if (aliased && aliased !== pid && record(aliased)) return aliased;
      }
    } catch (e) {}
    var lower = pid.toLowerCase();
    if (lower !== pid && record(lower)) return lower;
    var named = bySlug(pid);
    return named && record(named) ? named : '';
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
      if (_return === null) {
        // A COLD ARRIVAL on /p/<pid> has no earlier surface to return to, and
        // capturing the path we are about to re-stamp would make "close" a
        // no-op that leaves a closed person's address in the bar. The front
        // door is the honest destination — the same answer restore() already
        // gives when nothing was captured at all.
        _return = fromPath(location.pathname)
          ? '/'
          : location.pathname + location.search;
      }
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
    // The id the ROSTER uses, when it differs from the id the caller had. The
    // renderer resolves this for itself (openModal → PDXProfilePid), but the
    // address and the kicker are written HERE, so without this step a person
    // opened under an alias got one id's file under another id's address and a
    // blank kicker. Falls back to the caller's own id when nothing resolves, so
    // a genuinely unknown id still reaches openModal and still gets its honest
    // error state instead of being silently swallowed here.
    pid = resolve(pid) || pid;

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
    var asked = fromUrl();
    if (!asked) return '';
    // Strict, unlike open(): an id out of the address bar is untrusted input,
    // so an arrival that resolves to nobody says so instead of handing openModal
    // an id it will only fail on. Fails CLOSED — no modal, no blank shell
    // pretending the record loaded.
    var pid = resolve(asked);
    if (!pid) {
      try {
        var L = window.PDXShareLinks;
        if (L && fn(L.notice)) {
          L.notice('pdx-person-unresolved', 'Person file',
            'We couldn’t open the record that link named. Rather than quietly show ' +
            'you the front page, here’s the plain answer: “' + asked + '” isn’t ' +
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
    resolve: resolve,
    bootAdopt: function () { return bootAdopt(); },
    publishable: function (pid) {
      var F = floor();
      return !!(F && fn(F.clears) && F.clears(pid));
    }
  };

  // ── Cold deep link ────────────────────────────────────────────────────────
  // /p/<pid> is served by a netlify.toml rewrite, so the document that arrives
  // is the same index.html the front page is. Nothing in it knows a person was
  // asked for until this runs.
  //
  // WHAT WAS WRONG WITH THE FIRST VERSION
  //
  // One line: `setTimeout(adopt, 420)`, started the moment this deferred script
  // executed. Two things were wrong with that number, and both surfaced as the
  // same symptom — the app shell, no file, no explanation.
  //
  //   · 420ms is a GUESS about when the roster exists. PROFILES is fetched from
  //     Firestore over the network, behind an anonymous-sign-in wait that
  //     firebase-boot.js allows five whole seconds for. A pid that lives only in
  //     the live roster is therefore unresolvable at 420ms — so adopt() took its
  //     "isn't someone we currently carry a record for" branch about a person the
  //     app carries perfectly well, and then never looked again.
  //   · 420ms was also measured from the WRONG MOMENT, and measured by the wrong
  //     test. `document.readyState === 'loading'` is FALSE inside a deferred
  //     script — the spec sets readyState to 'interactive' before deferred
  //     scripts run — so the DOMContentLoaded branch above was dead code and the
  //     timer always started here, while the fifty deferred scripts after this
  //     one (profile-spine.js, word-action.js, the file's own stages) were still
  //     to execute.
  //
  // So arrival is now a WAIT rather than a bet. It retries until the roster
  // reports it has finished loading — window._pdxRosterState, the flag
  // firebase-boot.js already maintains for its own status pill — and only a
  // settled roster earns the not-found notice. The one thing this can no longer
  // do is call a real person unknown because the network was slow.
  var STEP = 120;           // ms between attempts
  var EARLY = 2000;         // a bundled-roster pid need not wait on a stalled fetch
  var SETTLED_GRACE = 240;  // one beat after the roster lands, before answering
  var CEILING = 15000;      // hard stop: this polls a flag, it does not poll forever
  var _adoptSettled = false;

  // firebase-boot.js sets this to 'loading', then to 'done' or 'error' — every
  // one of its load paths reaches one of the two, including the no-Firebase and
  // failed-fetch branches, so this cannot hang on a missing flag. An app served
  // without firebase-boot.js at all leaves it undefined, which is why EARLY and
  // CEILING exist.
  function rosterSettled() {
    var s = window._pdxRosterState;
    return s === 'done' || s === 'error';
  }

  function attempt(pid, waited, settledAt) {
    if (_adoptSettled) return;
    // The reader moved on, or something else opened a file first. Either way the
    // arrival is no longer the thing deciding what is on screen.
    if (fromPath() !== pid) { _adoptSettled = true; return; }
    if (window._pdxCurrentProfileId) { _adoptSettled = true; return; }

    if (settledAt === null && rosterSettled()) settledAt = waited;

    var ready = (settledAt !== null || waited >= EARLY);
    var canOpen = ready && !!resolve(pid) && fn(window.openModal);
    // Give the honest not-found answer only once the roster has actually
    // arrived (plus a beat for _checkAndTrigger's merge and the alias tables),
    // or once this has waited long enough that no answer is coming.
    var outOfTime = waited >= CEILING ||
      (settledAt !== null && waited - settledAt >= SETTLED_GRACE);

    if (canOpen || outOfTime) {
      _adoptSettled = true;
      try { adopt(); } catch (e) {}
      return;
    }
    setTimeout(function () { attempt(pid, waited + STEP, settledAt); }, STEP);
  }

  // Returns the pid it is going to try for, or '' when this URL names nobody —
  // the open itself is asynchronous, because the data it needs is.
  function bootAdopt() {
    var pid = fromPath();
    if (!pid) return '';      // ?p= is still owned by _pdxOpenFromUrl
    _adoptSettled = false;
    attempt(pid, 0, null);
    return pid;
  }

  // Started from a timer rather than from a readyState branch. A macrotask
  // scheduled inside a deferred script cannot run until every remaining deferred
  // script has executed and DOMContentLoaded has been dispatched, so this is the
  // earliest moment at which the whole client exists — and unlike
  // document.addEventListener('DOMContentLoaded'), it does not depend on
  // index.html's wrapper, which holds those listeners back until the roster
  // lands. 'load' is a second trigger for the case where this file is evaluated
  // late (injected, or re-run after the document is complete).
  if (fromPath()) {
    var _kicked = false;
    var kick = function () { if (_kicked) return; _kicked = true; bootAdopt(); };
    setTimeout(kick, 0);
    try { window.addEventListener('load', kick); } catch (e) {}
  }

  // Back/forward across person files. The path form makes this meaningful for
  // the first time: popping to /p/<other> should show that other file, and
  // popping off a person path should close the file rather than leave a stale
  // one open under a URL that no longer names it.
  window.addEventListener('popstate', function () {
    try {
      var raw = fromPath();
      var pid = raw ? resolve(raw) : '';
      var openNow = window._pdxCurrentProfileId || '';
      if (pid && pid !== openNow) { open(pid); return; }
      // Only an address that names no person at all closes the file. A person
      // path that resolves to nobody is a bad link, not an instruction to close
      // whatever the reader was looking at.
      if (!raw && openNow && fn(window.closeModal)) window.closeModal();
    } catch (e) {}
  });
})();
