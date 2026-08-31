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
     rule the sitemap is generated from.

     BELOW THE FLOOR IT SAYS WHICH KIND OF BELOW-THE-FLOOR IT IS, and this is
     the part that used to lie. There was one sentence for every unpublished
     file — "record still being built" — and it was printed over the two deepest
     files in the Utah lane, because the floor could not see the formal record
     and those two carry no cited stance card. The floor can see it now
     (formal-index.js), so those files clear and get their address; and the
     remaining below-floor files split in two, because they are two different
     facts about a record and only one of them is "we have not finished":

       empty formal record, with a reviewed reason on file — the file holds no
         formal act at all and we know why (seated after the last session on
         file, out of the Legislature before the earliest one, a candidate who
         was never seated, a federal id we do not ingest roll calls for). That
         is a documentation status, not work in progress, and the kicker says
         "no formal record on file" with the reviewed sentence in its tooltip.
       everything else — one cited position, or a file we genuinely have not
         finished. That keeps the app's own existing words.

     Nothing in either branch is a figure, and nothing in either branch is a
     verdict on the person: an empty file is a statement about what PolitiDex
     holds, and it is worded so it cannot be read as a statement about them.

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
  function formal() { return window.PDXFormalIndex || null; }

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

  // The one id this file will open for `pid`. A key the profile-alias table has
  // already ruled on — the repo's standing assertion that the id on the left is
  // NOT a separate officeholder — resolves to its canonical target before anyone
  // asks whether that retired key happens to have a document of its own. Without
  // this, a stray duplicate filed under the retired key opens as a second current
  // file for one seat (the /p/scott_chew vs /p/chew_h68 defect); with it, the
  // retirement holds wherever the arrival came from. Returns `pid` unchanged when
  // no table entry applies, so an id nobody has ruled on is never rewritten.
  function canonId(pid) {
    if (!pid) return '';
    pid = String(pid);
    try {
      if (fn(window.PDXProfilePid)) {
        var a = window.PDXProfilePid(pid);
        if (a && a !== pid && record(a)) return String(a);
      }
    } catch (e) {}
    return pid;
  }

  // '' for no match AND for an ambiguous one — a name that two records answer to
  // is not an address, so it does not get to pick one of them.
  //
  // Candidates are canonicalised BEFORE the ambiguity test, or the fix above
  // would defeat itself here: "Scott Chew" is the display name on both the
  // retired duplicate and the roster record, so the raw scan sees two ids for one
  // name and correctly refuses to pick — leaving a name search with no file at
  // all. Two ids that canonicalise to the same one are one match, not a tie.
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
        var cid = canonId(id);
        if (hit && hit !== cid) { hit = AMBIGUOUS; return; }
        hit = cid;
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
    // The alias hop runs FIRST, ahead of `record(pid)`. See canonId: a retirement
    // the repo has already asserted outranks a document that happens to sit under
    // the retired key, which is the whole of the one-person-two-files fix. It is
    // a no-op for every id with no table entry, so ordinary arrivals are untouched.
    var canon = canonId(pid);
    if (canon !== pid) return canon;
    if (record(pid)) return pid;
    var lower = pid.toLowerCase();
    if (lower !== pid) {
      var lc = canonId(lower);
      if (record(lc)) return lc;
    }
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

  // ── Citable sections ──────────────────────────────────────────────────────
  // A short, stable hash per citable surface inside a person file, so a finding
  // can be linked to at the place it is made rather than at the top of the page.
  // The alias is deliberately shorter and more stable than the DOM id: a section
  // can be re-anchored without breaking every link ever shared to it, and a
  // reader can type the address.
  //
  // FAIL CLOSED. An unrecognised hash resolves to '' and the file opens at the
  // top, which is what an arrival with no hash already does. Nothing here scrolls
  // to an id that came off the address bar unmapped.
  var SECTION_HASH = {
    gaps: 'pdxsec-gaps',            // What the record can't test yet
    record: 'pdxsec-standout',      // What the formal record points to
    verdict: 'pdxsec-wordaction'    // Direction Match, where it publishes
  };
  function sectionFromHash(h) {
    try {
      var raw = String(h == null ? location.hash : h).replace(/^#/, '').toLowerCase();
      return SECTION_HASH[raw] || '';
    } catch (e) { return ''; }
  }
  // The address to cite one section of one person file at.
  function sectionUrl(pid, alias) {
    var base = url(pid);
    if (!base) return '';
    return SECTION_HASH[String(alias || '').toLowerCase()] ? base + '#' + String(alias).toLowerCase() : base;
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

  // ── What the edge already told us, on this address ────────────────────────
  // The crawl header the edge writes into the first byte is not only for
  // crawlers. It carries, before a single module has executed, the two things a
  // cold arrival otherwise waits on the roster for: the CANONICAL roster id for
  // the address in the bar (data-pid), and the person's name, office and formal
  // rows as text. This reads it — and reads it only when it is provably about the
  // address the reader is on, which is the same two-string comparison the inline
  // guard at the top of index.html makes:
  //
  //   data-pdx-crawl-for  the address the edge GENERATED the block at
  //   location.pathname   the address this document was served for
  //
  // If they differ, the block is a cache artifact and nothing in it is known to
  // be about this reader (the /p/khanna-printing-Lee's-record defect), so it is
  // refused here exactly as the guard neutralises it there. A generic block —
  // written for an address the edge holds no record for — carries no data-pid and
  // is refused for the same reason: it names nobody, so it can tell us nothing.
  //
  // querySelector, not getElementById, on purpose: this runs on the resolve path
  // for every arrival, and it must not be the thing that decides the node was
  // looked for. crawlDone() is the only place that asks for the node by id.
  function crawlHeader() {
    try {
      var el = document.querySelector('#pdx-crawl-person');
      if (!el || !el.getAttribute) return null;
      var here = fromPath(location.pathname);
      if (!here) return null;
      if (el.getAttribute('data-pdx-crawl-for') !== PREFIX + here) return null;
      if (el.hasAttribute && el.hasAttribute('data-pdx-crawl-generic')) return null;
      var pid = el.getAttribute('data-pid');
      return pid ? { el: el, pid: String(pid) } : null;
    } catch (e) { return null; }
  }

  // The roster id the edge stamped for THIS address, or ''. Accepted only when a
  // roster record answers to it, because openModal renders from the roster and an
  // id with no record behind it would open the error state rather than a file.
  function stampId() {
    var h = crawlHeader();
    return h && record(h.pid) ? h.pid : '';
  }

  // ── THE FORMAL ROWS THE HEADER ALREADY PRINTED ────────────────────────────
  // The same rows arrivalSkeleton repeats below, parsed rather than pasted, so a
  // surface that renders the formal record can print what the first byte already
  // showed instead of a sentence saying there is nothing to show. That was a live
  // defect: the gold brief on a cold /p/steven_lund said "No formal pattern on
  // file yet" directly under a header that had just printed Parental Rights 8-2
  // and Water 7-0, off this very node.
  //
  // THE EDGE'S LINE FORMAT, READ THE WAY THE EDGE WROTE IT. share-preview.ts's
  // recordSection() joins "pattern · issue · counts" with " · " — and the counts
  // phrase carries its own separator ("8 advanced · 2 against"). So the first two
  // parts are taken and the REST is rejoined: the line is never split into more
  // fields than were written into it.
  //
  // IT WIDENS NOTHING. Same node and the same identity guard as arrivalSkeleton —
  // the block must be stamped for the address in the bar (crawlHeader) and must
  // name the person being asked about — and the same six-row cap the edge itself
  // applies. `text` is the untouched line for a caller that wants to repeat it
  // verbatim; a line the edge did not write as a pattern and an issue is carried
  // with those two fields empty rather than guessed at. Nothing here is a tier, a
  // score or a characterisation: it is one document's own header, re-read.
  function crawlRecord(pid) {
    try {
      var h = crawlHeader();
      if (!h) return [];
      // The header names one person. Nobody else may borrow their rows.
      if (canonId(h.pid) !== canonId(pid) && h.pid !== pid) return [];
      var lis = h.el.querySelectorAll ? h.el.querySelectorAll('[data-pdx-crawl-record] li') : [];
      var out = [];
      for (var i = 0; i < lis.length && i < 6; i++) {
        var t = String(lis[i].textContent || '').trim();
        if (!t) continue;
        var parts = t.split(' · ');
        out.push({
          text: t,
          pattern: (parts.length > 1) ? String(parts[0]).trim() : '',
          label: (parts.length > 1) ? String(parts[1]).trim() : '',
          counts: (parts.length > 2) ? parts.slice(2).join(' · ').trim() : ''
        });
      }
      return out;
    } catch (e) { return []; }
  }

  // resolve(), plus the edge's own answer for the address in the bar.
  //
  // WHY BOTH. resolve() reads the tables the app ships — PDX_PROFILE_ALIAS, the
  // case fold, the display-name slug — and they are a subset of what the edge
  // resolves through (db/share-index.json's personAliases is generated from more
  // of the repo's identity tables than any one client module carries). So an
  // address the edge could name and the client could not used to sit out the full
  // roster wait for no reason. The stamp is consulted SECOND, so nothing about how
  // the app resolves its own ids changes; it only answers where the app had no
  // answer, and only ever with an id that has a record on hand.
  function resolveArrival(pid) {
    return resolve(pid) || stampId();
  }

  // ── The skeleton that keeps the first paint on screen ─────────────────────
  // A cold /p/<pid> arrival opens the modal on a loading shell, because the full
  // profile document has not been fetched yet. That shell used to be a spinner
  // and the sentence "Loading <name>…", drawn OVER a header that was already
  // showing the reader the name, the office and up to six formal-record rows. The
  // page went backwards at the exact moment it was supposed to go forwards.
  //
  // So the shell repeats what the first paint already said. Same strings, read
  // out of the same header, re-escaped as text — nothing here parses or re-hosts
  // markup that came off the wire, and nothing here computes a row. The status
  // line under it is the only new sentence, and it is a status rather than the
  // whole content: the rows above it are real and stay put until the file lands.
  //
  // Returns '' when the header cannot be trusted for this pid, which is the
  // caller's cue to keep the spinner it always had. Two conditions, both cheap:
  // the header must be stamped for the address in the bar (crawlHeader), and the
  // id it names must be the id being opened — a person opened from a card while
  // some earlier arrival's header is still in the document gets no skeleton, and
  // above all not that other person's rows.
  var SKEL_STYLE = '<style>' +
    '.pdx-file-skel{padding:1.25rem 1.15rem 1.4rem;color:#eef4ff;text-align:left;}' +
    '.pdx-file-skel h2{margin:0 0 .35rem;font-size:1.55rem;line-height:1.15;' +
      "font-family:'Barlow Condensed',sans-serif;letter-spacing:.01em;color:#fff;}" +
    '.pdx-file-skel-line{margin:0 0 1rem;color:#9fb4d4;font-size:.9rem;line-height:1.45;max-width:60ch;}' +
    '.pdx-file-skel h3{margin:0 0 .45rem;font-size:.7rem;letter-spacing:.14em;' +
      'text-transform:uppercase;color:#f5c842;}' +
    '.pdx-file-skel ul{margin:0 0 1.15rem;padding:0;list-style:none;}' +
    '.pdx-file-skel li{margin:0 0 .3rem;padding:.5rem .7rem;border-radius:.4rem;' +
      'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);' +
      'color:#c9d8f2;font-size:.86rem;line-height:1.4;}' +
    '.pdx-file-skel-status{display:flex;align-items:center;gap:.5rem;margin:0;' +
      'color:#6b7c9c;font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;}' +
    '</style>';

  function arrivalSkeleton(pid) {
    try {
      var h = crawlHeader();
      if (!h) return '';
      // The header names one person. Opening anybody else must not borrow it.
      if (canonId(h.pid) !== canonId(pid) && h.pid !== pid) return '';

      var nameEl = h.el.querySelector ? h.el.querySelector('h1') : null;
      var name = nameEl ? String(nameEl.textContent || '').trim() : '';
      if (!name) return '';

      var ps = h.el.querySelectorAll ? h.el.querySelectorAll('p') : [];
      var line = ps && ps.length ? String(ps[0].textContent || '').trim() : '';

      // The same six rows, off the same node, through the one reader that parses
      // them (crawlRecord above) — repeated here as the header's own text, which
      // is what this shell has always printed.
      var rows = crawlRecord(pid).map(function (x) { return '<li>' + esc(x.text) + '</li>'; });

      return SKEL_STYLE +
        '<div class="pdx-file-skel" role="status" aria-live="polite" data-pdx-file-skel="' + esc(pid) + '">' +
          '<h2>' + esc(name) + '</h2>' +
          (line ? '<p class="pdx-file-skel-line">' + esc(line) + '</p>' : '') +
          (rows.length
            ? '<h3>Formal record</h3><ul>' + rows.join('') + '</ul>'
            : '') +
          '<p class="pdx-file-skel-status">' +
            '<span class="pdx-roster-spin" aria-hidden="true"></span>' +
            '<span>Loading the latest roster…</span>' +
          '</p>' +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── The first-byte crawl block ────────────────────────────────────────────
  // A cold arrival on /p/<pid> is served the app shell, and the shell is the same
  // document for every person — which is why a crawler read /p/lee as a duplicate
  // of the front page even after it had its own title and canonical. The edge
  // (netlify/edge-functions/share-preview.ts) now writes a short header into that
  // document naming who the page is about: name, office, state, formal record
  // first, and a link to the canonical address. It is the whole page for a reader
  // with no JavaScript, and for anyone else it is a placeholder that stops being
  // true the moment the live file is on screen.
  //
  // So it is hidden HERE, once — not removed. Hiding it keeps it in the DOM for a
  // rendering crawler that reads the document after scripts run, and leaves the
  // reader looking at the file itself rather than at a summary of the file sitting
  // above the app. It is only ever hidden by the OPEN path: a /p/<pid> arrival
  // that resolves to nobody keeps its block, because then the block is the only
  // thing on the page that says anything true. That case now has a block to keep —
  // the edge writes a GENERIC one for a pid it holds no record for (name, office,
  // state and issue rows all absent), so the seam at the top of a person document
  // is never empty for a cache layer to fill with the last member it happened to
  // hold. index.html's inline guard is the other half of that: it neutralises any
  // header whose data-pdx-crawl-for stamp is not the address in the bar, before
  // the first paint and long before this function runs.
  //
  // Nothing here can take an open down with it — the whole call sits in a guard at
  // its one call site, and the node is absent on every address except /p/<pid>.
  //
  // WHEN. Not when the modal opens — when the FILE is in it. openModal opens on a
  // loading shell whenever the full profile document has not been fetched yet,
  // which on a cold /p/<pid> is always, so hiding the block at open() time swapped
  // a header that already carried the right name and the right formal rows for a
  // centred spinner that said "Loading <name>…" and nothing else. The hide now
  // waits for mounted() below, which profiles-full.js calls at the one moment the
  // real content is in the DOM. open() still hides directly when the file is
  // already mounted by the time it returns (a warm profile, or any caller whose
  // renderer is synchronous), so nothing that used to hide immediately stopped.
  function crawlDone() {
    var el = document.getElementById('pdx-crawl-person');
    if (!el) return;
    el.hidden = true;
    // Belt and braces: the block ships its own inline <style>, and an inline
    // display beats any rule that might later win over [hidden].
    try { el.style.display = 'none'; } catch (e) {}
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

  // ── "The file is on screen" ───────────────────────────────────────────────
  // profiles-full.js sets window._pdxCurrentProfileId at the one point in
  // openModal where the built content is in the DOM — after the innerHTML write,
  // after the overlay is revealed. That is the honest definition of mounted, and
  // it is the one thing that distinguishes the real file from the loading shell
  // openModal opens first whenever a full profile document still has to be
  // fetched (which, on a cold /p/<pid>, is every time).
  function mountedNow(pid) {
    try { return String(window._pdxCurrentProfileId || '') === String(pid); }
    catch (e) { return false; }
  }

  // Called BY the renderer, at that point. Two things, both idempotent:
  //   · the first-byte header steps aside, now that there is a file to step
  //     aside for,
  //   · the stage clock takes the mark the perf pass is judged on — the moment a
  //     reader can read this person's name off the file itself.
  // A repeat call (openModal re-runs after the lazy document lands) hides an
  // already-hidden node and re-takes a mark that keeps its first value.
  function mounted(pid) {
    perf('file-named');
    try { crawlDone(); } catch (e) {}
    return true;
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

    // The reviewed "why is this file empty" sentence, when there is one. Asked
    // only on the below-floor path, and it answers null for anybody who has a
    // formal act on file — so this branch cannot print "empty" over a record.
    var why = null;
    if (!ok) {
      try {
        var FX = formal();
        if (FX && fn(FX.emptyNote)) why = FX.emptyNote(pid);
      } catch (e) { why = null; }
    }

    var state;
    if (ok) {
      state = '<a class="pf-kick-addr" href="' + esc(path(pid)) + '"' +
        ' title="This record has a citable address — copy it, or open it in a new tab"' +
        ' onclick="return window.PDXPerson.kickerClick(event);">' + esc(addr) + '</a>';
    } else if (why) {
      // "On file" and not "yet": for a former member or a seat filled after the
      // last session on file, "yet" promises a record that is not coming, which
      // is the same shape of lie in the other direction.
      state = '<span class="pf-kick-empty" title="' + esc(why.note +
        ' PolitiDex publishes a citable address once a record has cited content to show. ' +
        'This is a note about what we hold, not a judgement of the person.') +
        '">no formal record on file</span>';
    } else {
      state = '<span class="pf-kick-thin" title="A citable address is published once a record ' +
        'has at least two cited positions, or two measures with a sourced formal act. This one ' +
        'is still being built, so we do not advertise one for it yet.">record still being built</span>';
    }

    host.innerHTML = '<span class="pf-kick-what">Person file</span>' + state;
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

  // ── Warming the formal record, at the moment the file opens ───────────────
  // WHY THIS IS HERE AND NOT IN A RENDERER. Every surface that needs the formal
  // record fetches it lazily, from inside its own render: the issue rows, the
  // Say-vs-Do hydration, the Direction Match read. That is correct for each of
  // them in isolation and wrong for the file as a whole — the first fetch does
  // not start until a renderer that wants it has already run, so the reader
  // spends the whole of that round trip looking at "Still loading the roll-call
  // record" as the top state of a file whose chips can already count its rows.
  //
  // This funnel is the earliest honest place to start it: the pid is resolved,
  // the reader has committed to the file, and nothing here waits on the answer.
  // It is a warm, not a dependency — the request is memoised inside
  // PDXVotingRecord by (id, query), so the renderer that asks for the same page
  // size a moment later gets THIS promise instead of a second request, and a
  // failure costs exactly what it cost before: the lazy path retries.
  //
  //   { pageSize: 100 } is not a new number. It is the query every warming
  //   caller in the app already uses (profiles-full, consistency, receipt-cards,
  //   ballot-breakdown), and using a different one here would warm a cache key
  //   nobody reads and issue two requests instead of one.
  // Stage clock (index.html head + pdx-perf.js). First write wins; never throws.
  function perf(name) {
    try { if (window.PDXPerf && window.PDXPerf.mark) window.PDXPerf.mark(name); } catch (e) {}
  }

  var _warmed = {};
  function warm(pid) {
    if (!pid || _warmed[pid]) return;
    var VR = window.PDXVotingRecord;
    if (!VR || !fn(VR.fetchMember)) return;
    // Already resolved by an earlier open, a compare, or an issue-first read.
    try { if (fn(VR.memberRecords) && VR.memberRecords(pid)) return; } catch (e) {}
    _warmed[pid] = 1;
    try {
      VR.fetchMember(pid, { pageSize: 100 }).then(function (data) {
        try {
          if (data && data.items && fn(VR.noteMember)) {
            VR.noteMember(pid, data.items);
            perf('vr-warm');
            // Same event, same meaning, same owner as the one voting-record.js
            // fires when its own section finishes loading: "the sync record cache
            // is warm for this member". On a cold /p/ arrival this now happens
            // BEFORE the section loads, and the surfaces listening (the profile's
            // Voting Record Highlights slot, the hero's formal brief) need to hear
            // the moment the record exists, not the moment a section mounted. Both
            // listeners re-read the cache and repaint; a second dispatch later is
            // an idempotent repaint, not a double render.
            try { window.dispatchEvent(new CustomEvent('pdx-voting-warm', { detail: { pid: pid } })); } catch (e) {}
          }
        } catch (e) {}
      }, function () {});
    } catch (e) {}
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
    perf('person-open');
    try { stamp(pid); } catch (e) {}
    try { kicker(pid); } catch (e) {}
    // The edge's first-byte crawl header is superseded by the file — but only once
    // the file is actually THERE. openModal returns early on a loading shell
    // whenever the full profile document still has to be fetched, and hiding the
    // header then is how a cold arrival lost a paint it had already earned. So the
    // hide is conditional on the mount, and mounted() below does it otherwise.
    // Guarded like the two above, and for the same reason: a reader who can see
    // the file must not lose it to a chrome detail.
    if (mountedNow(pid)) { try { crawlDone(); } catch (e) {} }
    // Fired after the modal is up so it cannot delay the open by even one turn
    // of the event loop, and in its own guard for the same reason as the two
    // above: a warm that throws must not take the file down with it.
    try { warm(pid); } catch (e) {}

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
    // pretending the record loaded, and the edge's generic zero-row header is
    // left standing because it is then the only thing on the page that is true.
    var pid = resolveArrival(asked);
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
    // A hash on a cold arrival names a section INSIDE the file, so it is handed
    // to open() rather than left for the browser — the element it names does not
    // exist yet at arrival time.
    return open(pid, { section: sectionFromHash() }) ? pid : '';
  }

  window.PDXPerson = {
    PREFIX: PREFIX,
    PATH_RE: PATH_RE,
    open: open,
    url: url,
    path: path,
    SECTION_HASH: SECTION_HASH,
    sectionFromHash: sectionFromHash,
    sectionUrl: sectionUrl,
    stamp: stamp,
    restore: restore,
    kicker: kicker,
    kickerClick: kickerClick,
    fromPath: fromPath,
    fromUrl: fromUrl,
    adopt: adopt,
    record: record,
    resolve: resolve,
    // The arrival surface: what the edge already told this document about the
    // address in the bar, and the two things the renderer needs from it.
    resolveArrival: resolveArrival,
    arrivalSkeleton: arrivalSkeleton,
    // The header's formal rows, for the record surfaces that must not contradict
    // them. Read-only, identity-guarded, capped where the edge capped it.
    crawlRecord: crawlRecord,
    mounted: mounted,
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
  // RETIRED, not re-tuned. EARLY used to be "how long before we trust the bundled
  // roster instead of the fetched one" — 2000ms of guaranteed staring on an
  // address the app could resolve at once. Nothing needs it now: an arrival that
  // resolves opens immediately (see attempt), and the only answer that still waits
  // on the roster is "we carry nobody by that name", which waits on the flag
  // itself rather than on a number.
  var SETTLED_GRACE = 240;  // one beat after the roster lands, before answering
  var CEILING = 15000;      // hard stop: this polls a flag, it does not poll forever
  var _adoptSettled = false;

  // firebase-boot.js sets this to 'loading', then to 'done' or 'error' — every
  // one of its load paths reaches one of the two, including the no-Firebase and
  // failed-fetch branches, so this cannot hang on a missing flag. An app served
  // without firebase-boot.js at all leaves it undefined, which is why CEILING
  // exists.
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

    if (settledAt === null && rosterSettled()) { settledAt = waited; perf('roster'); }

    // THE FILE DOES NOT WAIT ON THE FULL ROSTER.
    //
    // This used to read `ready && !!resolve(pid) && …`, with `ready` meaning "the
    // roster has settled, or EARLY has elapsed". That gate cost every arrival the
    // app could already answer a flat 2000ms of staring: cmp-data.js is a bundled
    // script, so CMP_DATA is populated by the time this runs, and the alias tables
    // and the edge's own stamp are in the document from the first byte. The wait
    // was only ever there for the OTHER answer — telling a reader we carry nobody
    // by that name — and that answer is still gated, below, on the roster having
    // actually arrived.
    //
    // So: an address that resolves against what is on hand opens now, and the live
    // roster merges in behind it (openModal's own lazy full-profile fetch, and
    // every surface listening on PDXDataChanged, already handle arriving depth —
    // that is what they are for). An address that does not resolve yet keeps
    // polling, exactly as before, and fails closed only when the roster is in.
    var canOpen = !!resolveArrival(pid) && fn(window.openModal);
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

  // ── ONE REQUEST PER PERSON, ON THE ARRIVAL PATH ───────────────────────────
  // The id the record endpoint should be asked for, on a cold arrival, before
  // anything has been opened. Three sources, in the order of how much they know:
  //
  //   1. resolveArrival(path pid) — the app's tables plus the edge's stamp. This
  //      is the id the file will actually open under, so it is the id worth
  //      spending a request on.
  //   2. the head prefetch's own pid — window.__pdxVRPrefetch.pid, computed by the
  //      inline block in index.html from this same address through mirrors of the
  //      same two alias tables. Used when 1 has no answer yet, because adopting
  //      that in-flight request costs no network at all.
  //   3. the path pid, verbatim, for a document served without the head block.
  //
  // WHAT THIS FIXES. fetchMember canonicalises with PDXCanonicalPid, which knows
  // the voting-record retirements and NOT the roster bridges — so warming the raw
  // path pid on /p/scott_chew asked for `/member/scott_chew`, a URL the head
  // prefetch (correctly pointed at `chew_h68`) could not be adopted for. That was
  // two network requests for one person: one nobody reads, one that arrives late
  // because the first is ahead of it in the connection. Resolving first makes the
  // one request the head already started the one request the file uses.
  function warmTarget(pathPid) {
    var box = null;
    try { box = window.__pdxVRPrefetch; } catch (e) { box = null; }
    return resolveArrival(pathPid) || (box && box.pid) || pathPid;
  }

  // A prefetch for a member this arrival turns out NOT to be about is dead weight
  // on the one connection that matters (/p/mike_lee resolves to `lee`, and the
  // head cannot know that without the roster). Abandoning it frees the socket for
  // the request the file is waiting on, and claims the box so nothing can later
  // adopt a promise that is being aborted. Unclaimed only: a box fetchMember has
  // already taken is somebody's answer.
  function dropStalePrefetch(want) {
    try {
      var box = window.__pdxVRPrefetch;
      if (!box || box.claimed || !want || box.pid === want) return false;
      box.claimed = true;
      if (fn(box.abandon)) box.abandon();
      return true;
    } catch (e) { return false; }
  }

  // Returns the pid it is going to try for, or '' when this URL names nobody —
  // the open itself is asynchronous, because the data it needs is.
  function bootAdopt() {
    var pid = fromPath();
    if (!pid) return '';      // ?p= is still owned by _pdxOpenFromUrl
    perf('person-boot');
    // The record does not depend on the roster. attempt() below is a WAIT — for
    // the roster to settle so an unknown id can be answered honestly — and the
    // voting record has nothing to do with that question: the endpoint is keyed
    // by pid alone, and the pid is in the address. Warming here rather than from
    // open() hands the sync record cache (and every surface reading it) the
    // answer as soon as the network has it, instead of one roster wait later.
    // open() still calls warm(); it is memoised per pid, so this is the same one
    // request moved earlier, not a second one — and warmTarget makes sure it is
    // the SAME id open() will resolve to, so an alias arrival cannot spend two.
    var target = warmTarget(pid);
    dropStalePrefetch(target);
    try { warm(target); } catch (e) {}
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
