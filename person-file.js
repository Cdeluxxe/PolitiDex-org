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

  // ── IS THIS DOCUMENT THE PERSON FILE? ─────────────────────────────────────
  // NOT "does the URL name a person". Those are two different questions and
  // answering the second with the first is the defect this whole pass removes.
  //
  //   fromUrl()       — the URL names a person. TRUE on the homepage's legacy
  //                     /?p=<pid> form, where the document is index.html.
  //   ARRIVAL         — this document was SERVED for a /p/<pid> address. TRUE on
  //                     a cold person arrival, FALSE for a person opened from a
  //                     list on this same document one hop later.
  //   isPersonDoc()   — this document IS the person file, whoever it is showing
  //                     and however the reader got here.
  //
  // Only the third can decide "render or navigate", because only the third is a
  // fact about the DOCUMENT rather than about the address on it. person.html
  // writes the flag in its first inline block, ahead of every module, and no
  // other shell writes it — so /, /ballot, /i/<key>, /issue/<slug> and /b/… all
  // answer false and every person open on them is a navigation.
  //
  // Exported (PDXPerson.isPersonDoc) so profiles-full.js's renderer and
  // share-links.js's arrival can ask this file instead of each keeping a guess.
  //
  // ── AND THE SECOND ANSWER: THE PATH THIS DOCUMENT WAS SERVED FOR ─────────
  // ARRIVAL (below) is fromPath(location.pathname), read ONCE at module
  // evaluation. Non-empty means the browser asked for /p/<something> and got
  // this document back — and the only rule in netlify.toml that returns a
  // document for a /p/ path returns person.html. So a non-empty ARRIVAL is the
  // same claim the flag makes, arrived at from the server side, and it holds on
  // a build where the inline block was edited out, a document assembled by a
  // test harness, or a shell served by `netlify dev` without the head block.
  //
  // IT WIDENS NOTHING. ARRIVAL is a person PATH, and the addresses this guard
  // exists to exclude are not: '/' and '/?p=<pid>' are both pathname '/', which
  // is why the legacy query form still answers false here and still gets sent to
  // the document that can serve it. And because ARRIVAL is frozen at evaluation,
  // stamp()'s replaceState cannot later talk this into a different answer — the
  // exact drift that made crawlHeader() read against a moving target.
  function isPersonDoc() {
    try {
      if (window.__PDX_PERSON_DOC === true) return true;
    } catch (e) {}
    return !!ARRIVAL;
  }

  // ── "/p/null" IS NOT A PERSON ─────────────────────────────────────────────
  // encodeURIComponent(null) === 'null'. A missing pid that reaches a template
  // or a concatenation does not vanish on the way through String() — it turns
  // into a word, and the app publishes the address of a politician named null.
  // Analytics had /p/null as the second most visited path in this app. Every
  // guard here read `if (!pid)`, which catches null and undefined and '' and
  // cannot catch the three words they become.
  //
  // ONE predicate, exported, so the share URLs, the prefetch, the sitemap, the
  // trail chips and the compare buttons all fail on the same inputs in the same
  // way: by emitting nothing, rather than by emitting a person who is not one.
  var PID_SENTINEL = /^(?:null|undefined|nan)$/i;
  function realPid(pid) {
    if (pid == null) return false;
    var s = String(pid).trim();
    if (!s) return false;
    return !PID_SENTINEL.test(s);
  }

  // Takes a sentinel address off the bar without a redirect and without a new
  // history entry: the reader asked for nobody, so they get the front page, and
  // Back still goes where they came from. No 301, and no guessing at which real
  // politician a null was supposed to be.
  function scrubSentinelPath() {
    try {
      var m = String(location.pathname || '').match(PATH_RE);
      if (!m || realPid(m[1])) return false;
      history.replaceState(null, '', '/' + (location.search || '') + (location.hash || ''));
      return true;
    } catch (e) { return false; }
  }
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
    // THIRD SOURCE: the judicial registry. A retention seat is a person file
    // with an address, so /p/<pid> has to resolve for a judge the same way it
    // resolves for a senator. But a judge is deliberately NOT written into
    // either roster above, because a record in one of those inherits a party
    // chip, a score ring, promise counts and the publication floor's "record
    // still being built" notice — and every one of those would say something
    // false about an office that has no party line, no pledge ledger and no
    // roll call. judicial-retention.js owns that shape; this is the only line
    // in this file that reads it. Consulted LAST, so a pid that somehow exists
    // in both places keeps the roster's answer.
    try {
      var Jd = window.PDXJudicial;
      if (Jd && typeof Jd.personRecord === 'function') {
        var jr = Jd.personRecord(pid);
        if (jr) return jr;
      }
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
  // ONE SCAN PER ROSTER GENERATION. bySlug walks BOTH rosters and slugs every
  // display name in them — ~1,600 records and 1,600 regex passes for one answer.
  // That is fine once and ruinous eight times a second: attempt() below polls
  // this same question while it waits for the roster, and on an address the
  // bundled roster cannot answer (every live-roster-only pid) the answer was
  // recomputed from scratch on every tick, which is how a person file came to
  // earn Chrome's "this tab is slowing your browser". The result can only change
  // when a roster changes, so it is cached against a generation stamp: the
  // roster-load flag plus the derivation epoch, both of which move when a merge
  // lands. Cheap to read, and no scan repeats inside one generation.
  var _slugCache = {}, _slugGen = '';
  function rosterGen() {
    var st = '', ep = 0;
    try { st = String(window._pdxRosterState || ''); } catch (e) {}
    try { ep = (typeof window.PDXDataEpoch === 'function') ? window.PDXDataEpoch() : 0; } catch (e) { ep = 0; }
    return st + '|' + ep;
  }
  function bySlug(pid) {
    var want = slug(pid);
    if (!want) return '';
    var gen = rosterGen();
    if (gen !== _slugGen) { _slugGen = gen; _slugCache = {}; }
    if (Object.prototype.hasOwnProperty.call(_slugCache, want)) return _slugCache[want];
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
    var out = hit === AMBIGUOUS ? '' : hit;
    _slugCache[want] = out;
    return out;
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
    if (!realPid(pid)) return '';
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
    verdict: 'pdxsec-wordaction',   // Direction Match, where it publishes
    // Follow the Money's per-person section, whose anchor finance-lane.js has
    // published as SECTION_ID ('pdxsec-funding') since the letterhead chip
    // shipped. It gets an alias now because /money is its own document, and the
    // one thing that address is NOT allowed to do is render a second copy of a
    // person file: money-room.js forwards /money?p=<pid> to /p/<pid>#money, so
    // the jump the lane advertises has to resolve here rather than open the file
    // at the top. The alias is 'money', not 'funding', because that is the word
    // the lane, the nav and the chip all use out loud.
    money: 'pdxsec-funding'
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
    if (!realPid(pid)) return '';
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

  // ══════════════════════════════════════════════════════════════════════════
  // THE ISSUE / RECORD CARD IS AN ADDRESS ON THIS DOCUMENT
  // ──────────────────────────────────────────────────────────────────────────
  // WHAT WAS BROKEN. The issue dossier — one person, one issue, the votes and
  // the question behind them — had exactly one address and it was a HASH on the
  // front page: #record=lee~tough_on_crime. Three things followed from that, and
  // all three are the same bug:
  //
  //   · IT OPENED OVER THE WRONG DOCUMENT. receipt-cards.js's hash router
  //     painted PDXConsistency.openGap over whatever page happened to be loaded,
  //     which from a shared link was index.html — 2.3 MB of homepage under a
  //     sheet about one senator's votes.
  //   · BACK DID NOTHING. A hash written with replaceState (share-links.js) and
  //     a sheet opened with no history entry at all means the browser has no
  //     record that anything opened. Back took the PAGE away and left the sheet,
  //     or left the sheet and took the reader off the site. That is the trapped
  //     overlay in the report.
  //   · THE PERSON FILE COULD NOT SHOW ITS OWN CARD. share-links.js converted
  //     ?record= into #record= and STRIPPED the query, on every document
  //     including this one — so /p/lee?record=lee~tough_on_crime arrived, lost
  //     its own address, and then found no hash router here to act on it
  //     (receipt-cards.js is not on the person shell and must not be: it is the
  //     share-image engine, not the dossier).
  //
  // THE CARD NOW LIVES WHERE THE RECORD LIVES. Two accepted spellings, one
  // document, and a real history entry:
  //
  //   /p/lee?issue=tough_on_crime            canonical, and the one this writes
  //   /p/lee?record=lee~tough_on_crime       what a shared record card carries
  //
  // ?issue= is canonical because the pid is ALREADY in the path: repeating it in
  // the query is a second claim about who this is, and two claims can disagree.
  // ?record= is honoured rather than redirected, because record-card.js has been
  // handing that exact string out to readers and it must keep opening what it
  // promised — but its pid is CHECKED against the path, and a card that names
  // somebody else does not open. A dossier about Lee must never appear on
  // Hyde-Smith's file just because a URL was hand-edited.
  //
  // WHY THIS FILE OWNS IT. person-file.js already owns every question the card
  // needs answered — which pid the address means, whether the file is mounted,
  // what Back means here — and consistency.js owns the SHEET. Splitting it any
  // other way is how the app ended up with four modules disagreeing about one
  // overlay. Nothing here renders: openGap paints, this decides the address.
  // ══════════════════════════════════════════════════════════════════════════
  var CARD_PARAM = 'issue';        // the canonical one
  var CARD_PARAM_ALT = 'record';   // <pid>~<issueKey>, as shared cards spell it
  // The vocabulary key shape. Same alphabet as a pid, pinned here for the same
  // reason: a key this refuses gets no card rather than an escaped guess at one.
  var CARD_KEY_RE = /^[A-Za-z0-9_]+$/;

  // The card's address, root-absolute. '' when either half is unusable, which is
  // a caller's cue to print the plain person address instead of a card link.
  function cardPath(pid, issueKey) {
    // RESOLVED, unlike path(). path() deliberately keeps the id it was given —
    // stamp() needs the uncorrected form to recognise an alias arrival. A CARD
    // address is different: it is only ever something we hand out or navigate
    // to, so an alias here would publish /p/mike_lee?issue=… beside
    // /p/lee?issue=… for one card on one person, which is the duplicate this
    // whole pass collapses.
    var base = path(resolve(pid) || pid);
    if (!base) return '';
    var key = String(issueKey || '');
    if (!CARD_KEY_RE.test(key)) return '';
    return base + '?' + CARD_PARAM + '=' + encodeURIComponent(key);
  }
  function cardUrl(pid, issueKey) {
    var p = cardPath(pid, issueKey);
    return p ? origin() + p : '';
  }

  // What card, if any, the address in the bar names — ON A PERSON PATH ONLY.
  // Returns { pid, key } with the pid RESOLVED (so it is the id the file is
  // actually open under), or null. Refuses, rather than guesses, when:
  //   · the document is not at a person address (a card has no meaning there);
  //   · the key is not key-shaped;
  //   · ?record= names a different person than the path does.
  function cardFromUrl() {
    var here = fromPath();
    if (!here) return null;
    var who = resolve(here) || here;
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return null; }
    var key = String(q.get(CARD_PARAM) || '').trim();
    if (!key) {
      var raw = String(q.get(CARD_PARAM_ALT) || '').trim();
      if (!raw) return null;
      var bits = raw.split('~');
      var named = String(bits[0] || '').trim();
      key = String(bits[1] || '').trim();
      // THE IDENTITY CHECK. A record param carries its own pid, so it can
      // disagree with the path. The path wins the document and the mismatch
      // wins nothing: no card opens at all.
      if (!named || !key) return null;
      if ((resolve(named) || named) !== who) return null;
    }
    if (!CARD_KEY_RE.test(key)) return null;
    return { pid: who, key: key };
  }

  // The sheet, and the one module that owns it. consistency.js is deferred after
  // this file, so this is asked at call time rather than captured.
  function gapApi() {
    var CS = window.PDXConsistency;
    return (CS && fn(CS.openGap) && fn(CS.closeGap)) ? CS : null;
  }
  // Is a card on screen right now? The sheet is consistency.js's own node and it
  // is hidden rather than removed, so this is the honest read for both sides.
  function cardOpenNow() {
    try {
      var back = document.getElementById('pdxc-gap-back');
      return !!(back && !back.hidden);
    } catch (e) { return false; }
  }

  // ── The address half ──────────────────────────────────────────────────────
  // _cardPushed: did WE add the history entry the card is sitting on? A card
  // opened by a tap did (so closing it can consume that entry with back(), which
  // is what makes the browser's Back and the sheet's × mean the same thing). A
  // card the reader ARRIVED on did not — there is nothing of ours behind it, and
  // back() would take them off the site — so that one closes with a replaceState
  // onto the bare person address.
  // _cardSync: the popstate handler is already acting on an address the browser
  // moved, so the open/close it drives must not write the address again.
  var _cardPushed = false;
  var _cardSync = false;

  function pushCard(pid, issueKey) {
    if (_cardSync) return false;
    var to = cardPath(pid, issueKey);
    if (!to) return false;
    try {
      if ((location.pathname + location.search) === to) return false;
      history.pushState(null, '', to + location.hash);
      _cardPushed = true;
      return true;
    } catch (e) { return false; }
  }

  function dropCard() {
    if (_cardSync) return false;
    if (!cardFromUrl()) return false;
    try {
      if (_cardPushed) { _cardPushed = false; history.back(); return true; }
      var to = path(fromPath()) || '/';
      history.replaceState(null, '', to + location.hash);
      return true;
    } catch (e) { return false; }
  }

  // ── The two calls a surface makes ─────────────────────────────────────────
  // openCard: paint the sheet AND write the address, in that order, so a sheet
  // that could not be assembled never leaves a card's URL in the bar.
  function openCard(pid, issueKey, opts) {
    var who = resolve(pid) || (pid ? String(pid) : '');
    var key = String(issueKey || '');
    if (!who || !CARD_KEY_RE.test(key)) return false;
    var CS = gapApi();
    if (!CS) return false;
    var ok = false;
    try { ok = CS.openGap(who, key, opts || undefined) !== false; } catch (e) { ok = false; }
    if (!ok) return false;
    // openGap is WRAPPED below on this document, so it has already written the
    // address by the time this returns. The call here is the idempotent
    // belt-and-braces for a build where the wrap could not be installed.
    pushCard(who, key);
    return true;
  }
  function closeCard() {
    var CS = gapApi();
    if (CS) { try { CS.closeGap(); } catch (e) {} }
    dropCard();
    return true;
  }

  // ── ONE WRAP, SO EVERY EXISTING TAP GETS THE ADDRESS FOR FREE ─────────────
  // The dossier is opened from a dozen places on this file — the stance-tree
  // leaf, the Word-vs-Action shape row, the gap sheet's own sideways step, the
  // 🧾 tally — and every one of them calls PDXConsistency.openGap directly. Going
  // around and changing them all is how two of them end up disagreeing, so the
  // address is attached at the ONE function they share.
  //
  // Scoped to this document. On index.html, /ballot or an issue file nothing is
  // wrapped, because a card has no address there: a person open on those pages is
  // a navigation to /p/<pid> and the card comes with the file.
  //
  // The wrap adds an address and changes no answer: openGap's return value is
  // passed through untouched (word-action.js consumes a reader's tap only when it
  // is true), and a throw inside the address half cannot take the sheet down.
  var _gapHooked = false;
  function hookGap() {
    if (_gapHooked || !isPersonDoc()) return false;
    var CS = gapApi();
    if (!CS) return false;
    _gapHooked = true;
    var rawOpen = CS.openGap, rawClose = CS.closeGap;
    CS.openGap = function (pid, issueKey, opts) {
      var out = rawOpen.apply(this, arguments);
      if (out !== false) {
        try { pushCard(resolve(pid) || pid, issueKey); } catch (e) {}
      }
      return out;
    };
    CS.closeGap = function () {
      var out = rawClose.apply(this, arguments);
      try { dropCard(); } catch (e) {}
      return out;
    };
    return true;
  }

  // ── The card named in the address, opened once the file can hold it ───────
  // A cold /p/lee?issue=tough_on_crime arrives with neither consistency.js
  // executed nor the roll-call record fetched, so this is a short wait rather
  // than a bet — the same shape (and the same honesty rule) as the arrival wait
  // for the file itself: retry while the answer may still be coming, and when it
  // is not, say so instead of leaving a reader on a file wondering where the card
  // they followed went.
  var CARD_TRIES = 14, CARD_STEP = 180, CARD_STEP_MAX = 900, CARD_GROW = 1.3;
  function adoptCard(tries) {
    tries = tries || 0;
    var want = cardFromUrl();
    if (!want) return false;
    // The reader moved on, or closed it. Either way the address is no longer
    // asking for this card.
    if (cardOpenNow()) return true;
    hookGap();
    if (gapApi() && mountedNow(want.pid)) {
      _cardSync = true;   // the address already names this card; do not re-write it
      var ok = false;
      try { ok = openCard(want.pid, want.key, { arrival: true }); } catch (e) { ok = false; }
      _cardSync = false;
      if (ok) { perf('card-open'); return true; }
    }
    if (tries < CARD_TRIES) {
      var gap = Math.min(CARD_STEP_MAX, Math.round(CARD_STEP * Math.pow(CARD_GROW, tries)));
      setTimeout(function () { adoptCard(tries + 1); }, gap);
      return false;
    }
    // Out of retries. The file itself is on screen and correct, so this is not a
    // dead link — but the reader asked for one issue and got the whole record,
    // and being told which is the difference between a slow app and a lying one.
    try {
      var L = window.PDXShareLinks;
      if (L && fn(L.notice)) {
        L.notice('pdx-person-card-unresolved', 'Issue record',
          'We couldn’t open the issue card that link named, so you’re on the full ' +
          'record instead. The issue was “' + want.key + '” — it is on this page, ' +
          'lower down, with everything else on file.');
      }
    } catch (e) {}
    return false;
  }

  // ── Back and forward, across the card ────────────────────────────────────
  // Called from the one popstate handler at the foot of this file, after it has
  // settled which person the address names. The address is already where the
  // browser put it, so both branches run with _cardSync set: this SYNCS the sheet
  // to the bar, it does not move the bar.
  function syncCard() {
    var want = cardFromUrl();
    var openNow = cardOpenNow();
    if (!want && !openNow) return false;
    _cardSync = true;
    try {
      if (!want) {
        // Popped OFF a card address: /p/lee?issue=… → /p/lee. The sheet closes
        // and the file it was over is still there, which is exactly what Back
        // from a card should mean.
        var CS = gapApi();
        if (CS) { try { CS.closeGap(); } catch (e) {} }
        _cardPushed = false;
      } else {
        // Popped ONTO one (Forward, or Back from a deeper card). Re-open rather
        // than assume: the sheet may be showing a different issue.
        try { openCard(want.pid, want.key); } catch (e) {}
      }
    } finally { _cardSync = false; }
    return true;
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
      // A STAMP CORRECTS AN ADDRESS; IT MAY NOT CHANGE WHICH DOCUMENT IS AT ONE.
      // replaceState is the right tool for exactly one job here: an arrival on
      // /p/scott_chew whose record is filed under chew_h68 has to end up with
      // the canonical address in the bar, and it must NOT gain a history entry
      // doing it — Back from a corrected address to the uncorrected one would
      // re-resolve and correct again, which is a trap rather than a history.
      //
      // It is the wrong tool for the transition it used to be asked to make.
      // From '/' — the homepage, or the legacy /?p=<pid> form — the reader is on
      // index.html, and replaceState moves the bar to /p/<pid> while leaving
      // index.html loaded. That is the same class of defect as the close that
      // left person.html on screen at '/', seen from the other end: an address
      // that names a document the reader is not looking at. Since the person
      // split the only honest way onto a person address from the homepage is a
      // real navigation, and open() below makes one. So the stamp declines: a
      // caller already on a person path gets its correction, and a caller
      // anywhere else is left alone rather than given a lie.
      if (!fromPath(location.pathname)) return;
      // The hash is a section within the app and survives; the ?p= param does
      // not, because the path now carries what it used to.
      //
      // AND A SEARCH WITH NO ?p= IN IT IS PASSED THROUGH BYTE FOR BYTE. This
      // used to round-trip every address through URLSearchParams, which
      // re-serialises as well as parses: ?record=lee~tough_on_crime came back
      // out as ?record=lee%7Etough_on_crime, because URLSearchParams percent-
      // encodes '~' even though RFC 3986 lists it as unreserved. Harmless to a
      // parser, not harmless to a reader — that is the address in the bar, the
      // one they copy and send — and it made the shipped link and the address
      // after arrival two different strings. Nothing needs rebuilding unless
      // there is actually a ?p= to drop.
      var search = location.search || '';
      if (search.indexOf('p=') !== -1) {
        try {
          var q = new URLSearchParams(search);
          q.delete('p');
          var s = q.toString();
          search = s ? '?' + s : '';
        } catch (e) { search = ''; }
      }
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
  //
  // ── AND IT COMPARES AGAINST THE ARRIVAL, NOT AGAINST THE BAR ─────────────
  // This was the live cold-arrival defect. `location.pathname` is not a constant
  // on a person file: stamp() rewrites it the moment open() runs, to the
  // CANONICAL id, and the edge stamped the header for the id that was ASKED
  // for. So on /p/lee (canonical `slee`) the two strings agreed for exactly as
  // long as it took the modal to mount, and every read after that — the seed
  // rows the letterhead prints, crawlRecord()'s answer to "does the header list
  // rows for this pid" — got null from a header sitting in the document with the
  // rows in it. A first paint then said "No formal pattern on file yet" while a
  // vote chip a screen up said 68, and a hard reload "fixed" it only because the
  // second document's prefetch had already settled before anything asked.
  //
  // ARRIVAL is the address THIS DOCUMENT WAS SERVED FOR, read once at module
  // evaluation — before any modal, any stamp, any roster. That is the same
  // string the edge generated the block at, so the comparison is the one the
  // guard in index.html makes and it stays true for the life of the document.
  // It widens nothing: the stale-cache refusal is unchanged, because the inline
  // guard at the top of index.html already neutralises a block generated for
  // another address (data-pid removed, data-pdx-crawl-generic set) at first
  // parse, against this very address, and the generic check below still refuses
  // it. The live bar is still accepted as a fallback for the /?p= form and for
  // an in-app hop, where no document-level arrival exists.
  var ARRIVAL = (function () {
    try { return fromPath(location.pathname); } catch (e) { return ''; }
  })();

  function crawlHeader() {
    try {
      var el = document.querySelector('#pdx-crawl-person');
      if (!el || !el.getAttribute) return null;
      var forPath = el.getAttribute('data-pdx-crawl-for');
      var here = ARRIVAL || fromPath(location.pathname);
      if (!here) return null;
      if (forPath !== PREFIX + here && forPath !== PREFIX + fromPath(location.pathname)) return null;
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
      // THE ID IN THE ADDRESS MEANS THE PERSON THE HEADER NAMES. On /p/lee the
      // edge stamped data-pid="slee" and generated the block AT /p/lee, so the
      // two ids are the same claim about the same person, made by the same
      // resolver — and the caller that has not waited for the roster (the
      // letterhead, keyed by the arriving id) must not be told the header is
      // about somebody else. This is a spelling normalisation, not a widening:
      // it only ever fires for the one id this document was served for.
      if (ARRIVAL && String(pid) === ARRIVAL) pid = h.pid;
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
      // Same spelling normalisation crawlRecord makes, for the same reason: the
      // id this document was served for and the canonical id the edge stamped
      // are one claim about one person.
      if (ARRIVAL && String(pid) === ARRIVAL) pid = h.pid;
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

  // ── ON THE PERSON SHELL, CLOSE HAS TO LEAVE ───────────────────────────────
  // WHAT WAS WRONG, as it shipped. /p/* is served by person.html now, and on
  // that document the person file is not an overlay over anything: it IS the
  // page. So closing it handed the address back with a replaceState — which
  // changes the bar and fetches NOTHING — and left the reader looking at
  // person.html with its modal shut, at the homepage's address. The tell in the
  // live report was person.html's own `padding-top: calc(var(--pdx-chrome) +
  // 0.75rem)` still on <body> at '/': that offset exists to clear this
  // document's one-row bar and index.html does not declare it, so seeing it at
  // '/' is proof the document underneath never changed. Nothing was wrong with
  // that rule. The close was wrong.
  //
  // THE OTHER TWO SHELLS ALREADY DID THIS. pdx-issue-profile.js's restore()
  // leaves through PDXIssueBack.leave(), spotlight-engine.js leaves through its
  // own leave() — both with a real navigation, both for this exact reason. The
  // person shell is the one that was missed, and this is the same answer in the
  // same shape.
  //
  // ARRIVAL IS THE SIGNAL, and it is why this stays scoped to the shell. It is
  // the address THIS DOCUMENT WAS SERVED FOR, read once at module evaluation
  // (see the note over it), so it is non-empty on exactly the documents where
  // the file is the page. On index.html it is '' — the homepage's own profile
  // modal has a page underneath it, so it keeps closing onto that page through
  // the replaceState below, untouched. So does the /?p=<pid> form, which is
  // index.html too. Nothing here turns an in-page overlay into a navigation.
  //
  // AND IT IS A NAVIGATION, NOT A REPLACE. location.assign leaves a history
  // entry, so the browser's own Back still returns the reader to the file they
  // just closed — which is what Back meant on this document before the close
  // did anything at all.
  function leaveHome() {
    try { location.assign('/'); return true; } catch (e) {}
    try { location.href = '/'; return true; } catch (e2) {}
    try { location.replace('/'); return true; } catch (e3) {}
    return false;
  }

  // ── AND CLOSE SHOULD LEAVE THE WAY THE READER CAME ───────────────────────
  // leaveHome() is honest but blunt: it always goes to '/'. A reader who opened
  // Lee from /ballot and closed the file landed on the front page, which is not
  // where they were and, worse, is not what the browser's own Back button does
  // from the same position. Two ways out of one document that disagree is how a
  // reader loses their place — and the ballot is the surface where losing it
  // costs the most, because the list they were working through is the whole
  // point of being there.
  //
  // So close asks the history first: if the entry behind this one is OURS, go
  // back to it, and the × and the Back button become the same gesture. The
  // referrer is what makes that answerable rather than guessed — history.length
  // counts entries from before this tab ever reached the site, so on its own it
  // says nothing about whether the previous one is a PolitiDex page. A
  // same-origin referrer pointing at a DIFFERENT path is exactly the claim
  // needed: we came from a page of ours that is not this file.
  //
  // A cold deep link (no referrer, or an off-site one — a text message, a
  // search result, a tweet) has nothing of ours behind it, and back() there
  // would take the reader off the site entirely. That case still goes to '/',
  // which is the answer it always gave.
  function cameFromUs() {
    try {
      var r = document.referrer;
      if (!r) return false;
      var u = new URL(r, location.href);
      if (u.origin !== location.origin) return false;
      // A referrer that is THIS path is this document re-entered — a reload, a
      // hash step — not a surface to return to.
      if (u.pathname === location.pathname) return false;
      return true;
    } catch (e) { return false; }
  }

  // depth: how many of our own entries sit between the reader and the surface
  // they came from. One for the file. Two when a card we pushed is still on top
  // of it, because otherwise Back out of a card-plus-file lands back on the file
  // the reader just asked to close.
  function leaveBack(depth) {
    if (!cameFromUs()) return false;
    try { if (history.length <= depth) return false; } catch (e) { return false; }
    try { history.go(-depth); return true; } catch (e) {}
    return false;
  }

  function restore() {
    // The tab goes home with the address. Same helper the open used, so there is
    // exactly one spelling of "this tab is the front page" in the module.
    try { chrome(''); } catch (e) {}
    // isPersonDoc() rather than ARRIVAL, which is what this used to read.
    // isPersonDoc() SUBSUMES ARRIVAL — it is the flag person.html sets OR a
    // non-empty ARRIVAL, see its note — so the gate has not widened to any
    // address ARRIVAL let through. It has simply stopped being the only way to
    // recognise this document, and it names the thing being asked: on the person
    // FILE the close is a leave, and on index.html's own profile modal (where
    // there genuinely is a page underneath) it is still the replaceState below.
    if (isPersonDoc()) {
      _return = null;
      // The way in, run backwards, when there was one.
      if (leaveBack((cardFromUrl() && _cardPushed) ? 2 : 1)) return;
      // Falls through to the replaceState below if every navigation spelling
      // threw: a corrected address is a worse outcome than a loaded homepage and
      // a better one than a closed file still on the screen.
      if (leaveHome()) return;
    }
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

  // ── The tab, and the trail ────────────────────────────────────────────────
  // A person file is a modal, so the browser never navigates and nothing in the
  // chrome moved when one opened over another. Opening Hyde-Smith out of a Lee
  // session left the tab, the window list, the history entry and the breadcrumb
  // all saying "Mike Lee" — the address bar was the only thing in the browser
  // telling the truth about who was on screen, and it is the one part of the
  // browser a reader with four tabs open is not looking at.
  //
  // ONE helper, both ends of a file's life: open() names the person, restore()
  // (which closeModal already calls) puts the front page back. Two callers, one
  // spelling, so the two can never drift into disagreeing about what the tab
  // says.
  //
  // It states no finding, for the same reason kicker() does not: a title is the
  // most-quoted string on the page — it is what a bookmark, a tab strip and a
  // pasted link all show — and a verdict in it would be the headline everywhere
  // the file itself is not. Name and product, nothing else.
  var HOME_TITLE = 'PolitiDex | Bound by Truth';
  var _homeTitle = (function () {
    // NOT just document.title. On a cold /p/<pid> the edge
    // (netlify/edge-functions/share-preview.ts) has ALREADY rewritten <title> to
    // this person before a line of app code ran, so reading the live title at
    // module evaluation would capture Aaron Bean as "home" and closing his file
    // would leave the tab on him forever. When this document arrived on a person
    // address, the shell's own title is the constant; index.html is where it is
    // spelled, and this is the only other place.
    try {
      if (!ARRIVAL && document.title) return String(document.title);
    } catch (e) {}
    return HOME_TITLE;
  })();

  // The name to put in front of a reader, from whichever source already has it:
  // the rosters first (the same two, in the same order, as record()), then the
  // edge's first-byte header — which on a cold arrival is the ONLY thing that
  // knows the name, and is the reason the tab can be right before the roster is.
  function displayName(pid) {
    if (!pid) return '';
    var d = record(pid);
    var n = d && (d.name || d.fullName || d.displayName);
    if (n) return String(n).trim();
    try {
      var h = crawlHeader();
      if (h && (h.pid === pid || canonId(h.pid) === canonId(pid))) {
        var el = h.el.querySelector ? h.el.querySelector('h1') : null;
        var t = el ? String(el.textContent || '').trim() : '';
        if (t) return t;
      }
    } catch (e) {}
    return '';
  }

  // pid → this person's tab and this person's crumb. '' → the front page's tab,
  // and no crumb (closing a file does not add a step to the journey; it ends
  // one). Never throws, and never blanks a good title for a pid it cannot name:
  // a tab still reading the previous person is a bug, but a tab reading
  // "undefined · PolitiDex" is a worse one.
  function chrome(pid) {
    pid = pid ? String(pid) : '';
    var name = pid ? displayName(pid) : '';
    try {
      if (!pid) document.title = _homeTitle;
      else if (name) document.title = name + ' · PolitiDex';
    } catch (e) {}
    if (!pid || !name) return name;
    // The same crumb showProfile() records, through the same call. PDXJourney
    // dedupes on kind:pid and refreshes the label in place, so the two callers
    // cannot stack two steps for one person — and this one fires on the arrival
    // path, where showProfile never ran.
    try {
      var J = window.PDXJourney;
      if (J && fn(J.record)) {
        J.record('profile', { label: name, icon: '\uD83D\uDC64', nav: { type: 'profile', pid: pid } });
      }
    } catch (e) {}
    return name;
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

    // A JUDGE IS A DIFFERENT FILE CLASS, NOT A THINNER PERSON. The floor read
    // below asks "does this record carry two cited positions, or two measures
    // with a sourced formal act" — the right question for a legislator, and a
    // meaningless one for an office that does not vote bills. Asking it anyway
    // would stamp "record still being built" across a record that is complete
    // for what this office actually does, which is the single most misleading
    // thing this chrome could say about a retention seat. So the judicial
    // branch answers first and returns, and the floor is not moved an inch.
    if (d && d.judicial) {
      host.innerHTML = '<span class="pf-kick-what">Judge file</span>' +
        '<a class="pf-kick-addr" href="' + esc(path(pid)) + '"' +
        ' title="A judicial retention seat. This file carries the court, the retention' +
        ' question and the official performance evaluation. PolitiDex publishes no figure' +
        ' of its own for this office."' +
        ' onclick="return window.PDXPerson.kickerClick(event);">' +
        esc(String(url(pid)).replace(/^https?:\/\//, '')) + '</a>';
      return;
    }

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

    host.innerHTML = '<span class="pf-kick-what">Person file</span>' + state +
      voiceLink(pid) + boardLink(pid);
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

  // ── "District Voice" ───────────────────────────────────────────────────────
  // ONE quiet link, and only for the member who actually sits in a seat where
  // District Voice has opened — which is one seat today. It points at /voice,
  // District Voice's home, and it is the only generic thing about Voice anywhere
  // near a person file.
  //
  // IT POINTS AT THE READER'S HALLWAY, NOT AT THIS PERSON'S ROOM. /voice lists
  // the seats the READER's own saved location resolves, which for almost
  // everybody who opens this file are not this person's seat — and that is the
  // point of the lane. A reader with no location on file gets the door that sets
  // one instead, carrying the intent to land on /voice once it is set, so
  // nobody is left standing on the finder wondering what they just did. Both
  // decisions are district-voice.js's; this file asks and does not choose.
  //
  // WHAT IT IS NOT. Not a comment section on this person: every take District
  // Voice holds is keyed on a SEAT, so takes do not follow whoever holds it and
  // no take is ever printed on this file. Not a number: no count, no badge, no
  // activity dot — a tally of neighbours' sentences sitting on somebody's
  // dossier would be a metric about the person, and this file publishes none it
  // did not earn from the record. Not a new nav destination either; /voice is
  // already the nav's District Voice, which is exactly why this link goes there.
  //
  // Rendered by window.PDXVoice.personLinkHtml(), which answers '' for every pid
  // that does not hold such a seat — so this file holds no allow-list of its own
  // and degrades to exactly today's kicker when district-voice.js is missing.
  function voiceLink(pid) {
    try {
      var V = window.PDXVoice;
      if (!V || !fn(V.personLinkHtml)) return '';
      return V.personLinkHtml(pid) || '';
    } catch (e) { return ''; }
  }

  // ── "District 3 board" ────────────────────────────────────────────────────
  // ONE control, for the one member who sits in a seat that has a district board
  // at its own address — which is one member today, John Johnson in Utah Senate
  // District 3. It goes to /district/ut-sd-3, a real document that really
  // renders three real bands.
  //
  // IT IS NOT A DEAD BUTTON AND IT DOES NOT closeModal(). That is worth naming
  // rather than assuming: the control this pattern replaces elsewhere in the app
  // dismissed the file the reader was looking at, in the name of taking them
  // somewhere, and took them nowhere. This is a plain anchor to a plain address —
  // it opens in place, it copies, it opens in a new tab, and anything that
  // scrapes links can see where it goes.
  //
  // WHAT IT IS NOT. Not a second Voice link: PDXVoice.personLinkHtml() answers
  // for the SEAT's board inside the district file and this answers for the
  // district's own page, so on a member who has both, both appear and each says
  // which it is. Not a number — no count, no badge, no activity dot. A tally of a
  // district's activity sitting on somebody's dossier would be a metric about the
  // person, and this file publishes none it did not earn from the record.
  //
  // Rendered by window.PDXDistrictBoard.personLinkHtml(), which answers '' for
  // every pid that does not sit in such a seat — so this file holds no allow-list
  // of its own and degrades to exactly today's kicker when district-board.js is
  // missing, which it is on every document but one.
  function boardLink(pid) {
    try {
      var B = window.PDXDistrictBoard;
      if (!B || !fn(B.personLinkHtml)) return '';
      return B.personLinkHtml(pid) || '';
    } catch (e) { return ''; }
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
    // A retention seat casts no roll calls. There is no member record to warm
    // for a judge, so the fetch below would be a guaranteed miss — and, worse,
    // it would be the vote-pattern apparatus reaching for an office that has no
    // votes. Guarded here rather than in the caller because this is the
    // function that knows what it is about to ask for.
    try { var jd = record(pid); if (jd && jd.judicial) return; } catch (e) {}
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

  // ── The address for a section, as a hash ──────────────────────────────────
  // SECTION_HASH maps the short citable alias to the DOM id. open()'s `section`
  // option is the DOM id — the form _pdxNavJump takes — while some callers pass
  // the short alias instead, so this accepts either and always emits the alias,
  // which is the half that belongs in an address.
  // FAIL CLOSED, the same way sectionFromHash does: '' for anything unmapped,
  // because a hash this file cannot map is one the arriving document could not
  // act on either, and a bare /p/<pid> opens at the top rather than nowhere.
  function sectionHash(section) {
    var want = String(section || '');
    if (!want) return '';
    var low = want.toLowerCase();
    if (SECTION_HASH[low]) return '#' + low;
    for (var alias in SECTION_HASH) {
      if (Object.prototype.hasOwnProperty.call(SECTION_HASH, alias) &&
          SECTION_HASH[alias] === want) return '#' + alias;
    }
    return '';
  }

  // ── GOING TO A PERSON IS A NAVIGATION, AND THE PUSH IS THE POINT ──────────
  // /p/<pid> is served by person.html. So opening a person from a surface that
  // is not already that person's document is not a view change, it is a change
  // of document — and the only thing that actually changes the document is a
  // navigation.
  //
  // WHY NOT replaceState, WHICH IS WHAT THIS USED TO BE. A result row on '/'
  // called openModal and then stamped /p/<pid> into the bar with replaceState.
  // That left index.html loaded under a person's address and, because
  // replaceState overwrites the current entry instead of adding one, it also
  // consumed the homepage's place in the history: Back from a file opened out of
  // a search skipped past '/' entirely to whatever the reader was on before it.
  // A push is what makes Back mean "the list I came from".
  //
  // AND WHY NOT location.replace EITHER. It navigates, so the document would be
  // right — but it still overwrites the entry, so Back would still skip the
  // list. assign is the whole requirement; href is the same navigation spelled
  // for an engine that has taken assign away. There is deliberately no
  // location.replace fallback: failing to navigate is recoverable (the caller
  // gets false and the <a href> that surface printed is left to do the work),
  // whereas navigating without a history entry is the defect.
  function goToPerson(pid, section) {
    var to = path(pid);
    if (!to) return false;
    to += sectionHash(section);
    try { location.assign(to); return true; } catch (e) {}
    try { location.href = to; return true; } catch (e2) {}
    return false;
  }

  // ── The one-hop version, for an address that is being CORRECTED ───────────
  // location.replace is the forbidden mechanism everywhere else in this module,
  // and the reason is in goToPerson's note: it overwrites the entry Back needs.
  // That is precisely why it is the right one here. A legacy /?p=<pid> link is
  // not a place the reader chose to be, it is a spelling of an address, so the
  // entry it occupies is worth nothing and keeping it is what builds the forward
  // trap (Back → /?p= → resolves → pushes forward → Back → …). Replacing it
  // leaves the history looking exactly as if the reader had followed the
  // canonical link in the first place.
  //
  // No location.href fallback: href is assign, which would push. If replace is
  // unavailable the caller falls through to goToPerson's push, which is a worse
  // history but a correct document — and a correct document is the requirement.
  function hopToPerson(pid, opts) {
    opts = opts || {};
    var to = (opts.issue && cardPath(pid, opts.issue)) || path(pid);
    if (!to) return false;
    if (!opts.issue) to += sectionHash(opts.section);
    try { location.replace(to); return true; } catch (e) {}
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

    // ── IS THIS DOCUMENT ALREADY THIS PERSON'S FILE? ─────────────────────────
    // The one question that decides between rendering and navigating, and the
    // reason this change exists is that it used to be asked WRONG.
    //
    // IT USED TO ASK THE ADDRESS: `fromUrl()`, which is every way a URL can name
    // a person — including the legacy query form `/?p=<pid>`. So a person opened
    // on the homepage under `/?p=lee` compared equal to itself and RENDERED: a
    // modal painted over index.html, two and a bit megabytes of front page still
    // loaded beneath it, the address naming a person that no document on screen
    // was actually serving. Every "opening a person from home / Eye / WRM /
    // cards still paints a modal on /" report is that one comparison.
    //
    // IT NOW ASKS THE DOCUMENT, AND THEN THE PATH. `isPersonDoc()` is true only
    // inside person.html — the document the person-path rewrite serves and the only
    // one that has the file's markup, CSS and sections. Anywhere else the answer
    // is no before the pid is even looked at, and the open becomes a navigation
    // to `/p/<pid>`. That is the whole "same move as /ballot": one document per
    // person, reached by going there.
    //
    // WHEN IT IS ALREADY OURS, RENDER. This is what keeps the change from
    // eating itself: adopt() calls open() on a cold arrival and the popstate
    // handler calls it after the browser has already moved the bar, so an
    // unconditional navigation would reload person.html on arrival, for ever,
    // and would turn every Back into a forward. Both of those run inside
    // person.html with the path already naming this person, so both still fall
    // through to the renderer below exactly as before.
    //
    // fromPath() rather than fromUrl() for the second half, because on THIS
    // document the path IS the address — and resolved on both sides before
    // comparing, so an alias arrival (/p/scott_chew, record chew_h68) is
    // recognised as already-here and gets its in-place stamp correction instead
    // of being navigated to its own canonical twin.
    var asked = isPersonDoc() ? fromPath() : '';
    var hereIs = asked ? (resolve(asked) || asked) : '';
    if (hereIs !== pid) {
      // ── THE LEGACY /?p=<pid> FORM IS A REDIRECT, NOT A PUSH ────────────────
      // This one address is both "not the person document" and "already naming
      // this person", which is the one case where the two halves of the question
      // disagree — and it needs its own answer, because both of the obvious ones
      // are wrong.
      //
      //   · RENDER IN PLACE, which is what it used to do, paints the file into
      //     index.html: the homepage's whole apparatus underneath, and none of
      //     person.html's own markup, sections or CSS. That is the "modal on /"
      //     defect, just reached from a link instead of a click.
      //   · PUSH, with assign, is a FORWARD TRAP. It leaves /?p=<pid> in the
      //     history, so Back re-loads index.html, which re-reads ?p= (that is
      //     what _pdxOpenFromUrl does), which pushes forward again. The reader
      //     cannot get out with the Back button.
      //
      // So: navigate, with location.replace, and CONSUME the entry. /?p=<pid>
      // was never a surface a reader chose to be on — it is an old link shape
      // arriving from off-site — so there is nothing behind it worth keeping, and
      // Back goes wherever the reader was before they followed it. One hop, onto
      // the canonical address, exactly as the #record= hash now does.
      //
      // Narrow on purpose: fromUrl() has to name THIS person. A /?p=<other>
      // layered under a click on somebody else is a result click, and gets the
      // push that keeps Back meaning "the list I came from".
      var urlPid = fromUrl();
      if (urlPid && (resolve(urlPid) || urlPid) === pid && hopToPerson(pid, opts)) return true;
      // An issue card asked for from somewhere else is one navigation, not two:
      // the card's own address carries the person, so the reader lands on the
      // file WITH the dossier up and Back returns them to where they tapped —
      // rather than landing on the file, then pushing a card, then needing two
      // Backs to leave.
      if (opts.issue && goToCard(pid, opts.issue)) return true;
      if (goToPerson(pid, opts.section)) return true;
    }

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
    // The tab and the trail, on the same guard and for the same reason as the
    // address above: chrome is worth getting right, and worth nothing if getting
    // it wrong can close the file.
    try { chrome(pid); } catch (e) {}
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
    // Already this person's file, and an issue was named: the card is a layer on
    // a document that is already here, so it opens in place and pushes its own
    // entry. Deferred for the same reason the section jump is — the sheet reads
    // the record the file is still mounting.
    if (opts.issue) {
      setTimeout(function () {
        try { openCard(pid, opts.issue); } catch (e) {}
      }, 60);
    }
    return true;
  }

  // ── Going straight to a card on somebody's file ───────────────────────────
  // Same contract, same reasoning and the same deliberate absence of a
  // location.replace fallback as goToPerson: a push is what makes Back mean "the
  // surface I tapped from", and a caller that gets false still has the <a href>
  // it printed.
  function goToCard(pid, issueKey) {
    var to = cardPath(pid, issueKey);
    if (!to) return false;
    try { location.assign(to); return true; } catch (e) {}
    try { location.href = to; return true; } catch (e2) {}
    return false;
  }

  // ── THE ONE SENTENCE THIS MODULE MAY NOT SAY EARLY ───────────────────────
  // "“aaron_bean” isn’t someone we currently carry a record for" is a claim about
  // the ROSTER, and on a cold arrival the roster is still arriving: cmp-data.js
  // can be served stale out of an old service-worker cache, PROFILES is a
  // Firestore fetch behind an anonymous-sign-in wait, and the alias tables land
  // with the scripts that own them. The live defect was exactly that ordering —
  // /p/aaron_bean printed the crawl brief, then this toast, then opened his file.
  // The app called itself a liar on the first paint of a record it holds.
  //
  // Two conditions now, both required, and NEITHER lengthens the wait:
  //
  //   · THE WAIT MUST HAVE ENDED. attempt() below owns the only clock here and
  //     keeps every number it had (CEILING, MAX_TRIES, SETTLED_GRACE); this flag
  //     is set while that loop is live and cleared the moment it stops. While it
  //     is live the honest surface is the one already on screen — the skeleton's
  //     "Loading the latest roster…" — and silence is what that sentence needs
  //     to stay true.
  //   · NOTHING ON THE PAGE MAY ALREADY DISPROVE IT. Three reads, all of them
  //     things this module already consults, none of them a new source:
  //       — PROFILES and CMP_DATA, re-asked at the moment of speaking rather
  //         than trusted from the resolve one line earlier. A SECOND READ, not a
  //         second roster;
  //       — the same two under the id the address MEANS, not only the id it was
  //         spelled with;
  //       — THE EDGE'S OWN FIRST-BYTE HEADER. This is the read that closes the
  //         Bean case. share-preview.ts resolved /p/aaron_bean server-side, off
  //         db/share-index.json, and wrote his name, his seat and his formal
  //         record into the document before a line of app code ran — so the
  //         first paint the reader got is a standing disproof of the sentence
  //         below it. crawlHeader() is identity-guarded to the address in the
  //         bar and refuses a generic zero-row block, so it can only be truthy
  //         when the edge named THIS person at THIS address; a stale bundled
  //         roster on a warm device cannot make it lie.
  //     If any of the three has the person, the sentence is false, and a false
  //     sentence is not printed — the arrival falls through to the header and the
  //     loading shell it already had, which are both true.
  //
  // Returns whether it spoke, so a caller (and the test) can tell "we said we
  // don't carry them" from "we stayed quiet".
  function knownHere(pid) {
    if (!pid) return false;
    if (record(pid)) return true;
    try {
      var canon = resolveArrival(pid);
      if (canon && record(canon)) return true;
    } catch (e) {}
    try {
      var h = crawlHeader();
      if (h && h.pid) return true;
    } catch (e) {}
    return false;
  }

  function unresolvedNotice(asked) {
    if (_waitOpen) return false;
    if (knownHere(asked)) return false;
    try {
      var L = window.PDXShareLinks;
      if (L && fn(L.notice)) {
        L.notice('pdx-person-unresolved', 'Person file',
          'We couldn’t open the record that link named. Rather than quietly show ' +
          'you the front page, here’s the plain answer: “' + asked + '” isn’t ' +
          'someone we currently carry a record for.');
      }
    } catch (e) {}
    return true;
  }

  // Open whatever person the current URL names. Returns the pid it opened, or
  // '' — including when the URL names someone the roster does not carry, which
  // is reported rather than swallowed, the same way _pdxOpenFromUrl reports it.
  function adopt() {
    var asked = fromUrl();
    if (!asked) return '';
    // A sentinel is not an unknown id — it is the absence of one, and nobody
    // typed it. So there is no honest not-found answer to give and no notice to
    // raise: the address is quietly corrected to the front page and the reader
    // gets the homepage they would have got from a bare '/'.
    if (!realPid(asked)) { scrubSentinelPath(); return ''; }
    // Strict, unlike open(): an id out of the address bar is untrusted input,
    // so an arrival that resolves to nobody says so instead of handing openModal
    // an id it will only fail on. Fails CLOSED — no modal, no blank shell
    // pretending the record loaded, and the edge's generic zero-row header is
    // left standing because it is then the only thing on the page that is true.
    var pid = resolveArrival(asked);
    if (!pid) {
      unresolvedNotice(asked);
      return '';
    }
    // A hash on a cold arrival names a section INSIDE the file, so it is handed
    // to open() rather than left for the browser — the element it names does not
    // exist yet at arrival time.
    var ok = open(pid, { section: sectionFromHash() });
    if (!ok) return '';
    // AND A CARD IN THE ADDRESS IS PART OF THE ARRIVAL, not something to open
    // after it. /p/lee?issue=tough_on_crime is one request for one thing: this
    // person's record on this issue. adoptCard waits for consistency.js and for
    // the mount on its own clock (open() has only just started the file), and it
    // must NOT be handed to open() as opts.issue — that would push a second
    // history entry on top of the address the reader already arrived at, so the
    // first Back would put them back on the card they were already looking at.
    // The card the reader ARRIVED on has nothing of ours behind it, which is the
    // whole reason _cardPushed exists.
    try { adoptCard(0); } catch (e) {}
    return pid;
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
    // The tab + trail helper open() and restore() share, and the name it puts in
    // front of a reader. Exported so the chrome can be asserted on directly
    // rather than inferred from a title string somebody else set.
    chrome: chrome,
    displayName: displayName,
    HOME_TITLE: HOME_TITLE,
    kickerClick: kickerClick,
    fromPath: fromPath,
    fromUrl: fromUrl,
    adopt: adopt,
    // ── Which document am I? ───────────────────────────────────────────────
    // Exported because it is the question five modules were each answering for
    // themselves, differently: profiles-full.js deciding whether openModal may
    // paint or must navigate, share-links.js deciding whether ?record= is its
    // param to consume, receipt-cards.js deciding whether a #record= hash is
    // an overlay or a redirect. One answer, one owner.
    isPersonDoc: isPersonDoc,
    // ── The issue / record card, as an address on this document ────────────
    // CARD_PARAM / CARD_PARAM_ALT are exported so a test and an emitter read
    // the same two strings this reader does, rather than three copies of
    // 'issue' and 'record' drifting apart.
    CARD_PARAM: CARD_PARAM,
    CARD_PARAM_ALT: CARD_PARAM_ALT,
    cardPath: cardPath,
    cardUrl: cardUrl,
    cardFromUrl: cardFromUrl,
    openCard: openCard,
    closeCard: closeCard,
    goToCard: goToCard,
    adoptCard: function () { return adoptCard(0); },
    hookGap: hookGap,
    // The sentinel wall. Exported so every other emitter of a /p/ address can
    // ask this file the question rather than each keeping its own list.
    realPid: realPid,
    scrubSentinelPath: scrubSentinelPath,
    record: record,
    resolve: resolve,
    // The arrival surface: what the edge already told this document about the
    // address in the bar, and the two things the renderer needs from it.
    resolveArrival: resolveArrival,
    arrivalSkeleton: arrivalSkeleton,
    // The header's formal rows, for the record surfaces that must not contradict
    // them. Read-only, identity-guarded, capped where the edge capped it.
    crawlRecord: crawlRecord,
    // The pid the address bar carried when THIS document was parsed, or ''.
    // Constant for the life of the document — stamp() cannot move it and the
    // roster is not consulted — so a surface that must decide "is a record
    // coming for the person on screen?" before anything has resolved can ask.
    arrivalPid: function () { return ARRIVAL; },
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
  // ── AND A CAP ON THE NUMBER OF TICKS, NOT JUST ON THE CLOCK ────────────────
  // CEILING alone permitted 125 attempts on one arrival, every one of them
  // re-asking the roster a question whose answer cannot change between ticks, at
  // 120ms — on the same main thread that is mounting the file, warming the
  // record and repainting the hero. Two changes, both of which keep the outer
  // 15s window exactly as it was:
  //   · the gap GROWS (120ms, 162, 219, … capped at 900ms), so the dense polling
  //     happens in the first second where the answer plausibly arrives, and the
  //     long tail costs almost nothing;
  //   · a hard MAX_TRIES, so no timing pathology (a background tab whose timers
  //     are clamped, a clock that jumps) can turn this into an open-ended loop.
  // A poll that ends early is not a poll that answers wrong: the answers
  // themselves — open the file, or say we carry nobody by that name — are
  // unchanged, and adopt() is still what gives them.
  var STEP_MAX = 900;
  var STEP_GROW = 1.35;
  var MAX_TRIES = 40;
  var _adoptSettled = false;
  // "The arrival wait is live." Set by bootAdopt when the poll starts, cleared
  // the instant attempt() stops polling for any reason — resolved, out of time,
  // abandoned. unresolvedNotice() above is the only reader: it is the gate that
  // keeps "we don't carry this person" behind the wait that would disprove it.
  var _waitOpen = false;

  // firebase-boot.js sets this to 'loading', then to 'done' or 'error' — every
  // one of its load paths reaches one of the two, including the no-Firebase and
  // failed-fetch branches, so this cannot hang on a missing flag. An app served
  // without firebase-boot.js at all leaves it undefined, which is why CEILING
  // exists.
  function rosterSettled() {
    var s = window._pdxRosterState;
    return s === 'done' || s === 'error';
  }

  function stopWait() { _adoptSettled = true; _waitOpen = false; }

  function attempt(pid, waited, settledAt, tries) {
    if (_adoptSettled) return;
    tries = tries || 0;
    // The reader moved on, or something else opened a file first. Either way the
    // arrival is no longer the thing deciding what is on screen.
    if (fromPath() !== pid) { stopWait(); return; }
    // THE FILE IS ALREADY NAMED. profiles-full.js sets this at the one point in
    // openModal where the built content is in the DOM (see mountedNow), so a
    // truthy value means a reader is looking at a file — this one, or one they
    // opened themselves while this was waiting. Either way there is nothing left
    // for the arrival to decide, and every further tick is pure cost on a tab
    // that is now doing real work.
    if (window._pdxCurrentProfileId) { stopWait(); return; }

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
    var outOfTime = waited >= CEILING || tries >= MAX_TRIES ||
      (settledAt !== null && waited - settledAt >= SETTLED_GRACE);

    if (canOpen || outOfTime) {
      // Cleared BEFORE adopt(), not after: this is the moment the wait ends, and
      // adopt() is the call that may need to say we carry nobody by that name.
      stopWait();
      try { adopt(); } catch (e) {}
      return;
    }
    var gap = Math.min(STEP_MAX, Math.round(STEP * Math.pow(STEP_GROW, tries)));
    setTimeout(function () { attempt(pid, waited + gap, settledAt, tries + 1); }, gap);
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
    // /p/null, /p/undefined: no poll, no roster wait, and above all no warm() —
    // the record endpoint must never be asked for a member named null.
    if (!realPid(pid)) { scrubSentinelPath(); return ''; }
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
    _waitOpen = true;
    attempt(pid, 0, null, 0);
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

  // ── The card hook, installed once, on this document only ─────────────────
  // adoptCard() installs it too, but only when the ARRIVAL named a card. The far
  // commoner case is a reader who arrives at /p/lee and then taps an issue —
  // stance-tree leaf, Word-vs-Action row, the 🧾 tally — and every one of those
  // calls PDXConsistency.openGap directly. Without the hook in place before the
  // first tap, that dossier opens with no address and no history entry, and Back
  // takes the reader off the file instead of out of the card. That is the exact
  // trapped-overlay behaviour this change exists to remove, so the hook cannot
  // wait for a link that names a card.
  //
  // consistency.js is 1.2 MB and deferred after this file, so PDXConsistency
  // does not exist yet at module evaluation. A short poll rather than a load
  // listener, because a hook installed one turn late is still installed before
  // any reader has tapped anything, and because failing to find the module must
  // cost nothing on a shell that deliberately omits it.
  if (isPersonDoc()) {
    (function () {
      var tries = 0;
      var look = function () {
        if (hookGap() || ++tries > 40) return;
        setTimeout(look, 150);
      };
      setTimeout(look, 0);
      try { window.addEventListener('load', look); } catch (e) {}
    })();
  }

  // Back/forward across person files. The path form makes this meaningful for
  // the first time: popping to /p/<other> should show that other file, and
  // popping off a person path should close the file rather than leave a stale
  // one open under a URL that no longer names it.
  window.addEventListener('popstate', function () {
    try {
      var raw = fromPath();
      // A sentinel popped into the bar names nobody — not a bad link, an absent
      // one — so it is scrubbed and then treated exactly like '/'.
      if (raw && !realPid(raw)) { scrubSentinelPath(); raw = ''; }
      var pid = raw ? resolve(raw) : '';
      var openNow = window._pdxCurrentProfileId || '';
      // THE PERSON SETTLES FIRST, THEN THE CARD. A card is a layer ON a file, so
      // the file has to be the right one before the question "which card" even
      // has an answer — and syncCard() reads the pid out of the path it has just
      // been moved to, so doing it in the other order would open a dossier on
      // whoever was previously on screen.
      if (pid && pid !== openNow) { open(pid); syncCard(); return; }
      // Only an address that names no person at all closes the file. A person
      // path that resolves to nobody is a bad link, not an instruction to close
      // whatever the reader was looking at.
      if (!raw && openNow && fn(window.closeModal)) window.closeModal();
      // Same file, the card moved: /p/lee?issue=x → /p/lee is Back out of a
      // dossier, and it closes the sheet and leaves the reader on the record.
      // The reverse is Forward. Both are a sheet following an address the browser
      // has already moved, which is why syncCard never writes the address back.
      syncCard();
    } catch (e) {}
  });
})();
