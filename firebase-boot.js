
  // The Firebase Web API key is a PUBLIC client identifier — access is governed by
  // Firebase Security Rules, not by keeping this value secret (Google documents it
  // as safe to ship in client code). It is injected at request time from the
  // FIREBASE_API_KEY environment variable via /firebase-config.js when that var is
  // configured; we fall back to the project's known public key so the app still
  // initializes when the env var is unset or the injector script fails to load.
  // (An empty/missing key makes firebase.auth() throw auth/invalid-api-key, which
  // previously aborted this whole script and froze every deferred renderer on the
  // page.) This value is safelisted for Netlify secret scanning in netlify.toml.
  var firebaseConfig = {
    apiKey: window.__FIREBASE_API_KEY__ || "AIzaSyDNkLuB8wmLuz38dfL8ZP6rvnv-efZvnyU",
    authDomain: "politidex-979bd.firebaseapp.com",
    projectId: "politidex-979bd",
    storageBucket: "politidex-979bd.firebasestorage.app",
    messagingSenderId: "326156949034",
    appId: "1:326156949034:web:f7c03559db5fb262db1553"
  };
  var app, db, firestore, auth;
  try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firestore = db;
    auth = firebase.auth();
  } catch (e) {
    // Defense in depth: a bad/missing API key (or any other init failure) must
    // never abort this script. Doing so leaves _firestoreLoaded stuck false, so the
    // deferred-DOMContentLoaded gate never fires and every section that renders on
    // it — the Evidence Locker included — hangs forever on its spinner. Instead we
    // degrade to a no-live-data mode: the page runs entirely on its bundled static
    // data (CMP_DATA / SPOTLIGHT_DATA), which is enough for the Locker to render.
    console.error("Firebase initialization failed; continuing on bundled data:", e && e.message);
    // A db stub whose .collection is falsy so the guarded Firestore paths
    // (_pdxEnsureFullProfile, _pdxLoadFullCollection) take their no-Firebase branch
    // instead of throwing on null.
    db = { collection: null };
    firestore = db;
    // A minimal auth stub so the rest of the page's auth-aware code never throws.
    auth = {
      currentUser: null,
      onAuthStateChanged: function (cb) { try { cb(null); } catch (e2) {} return function () {}; },
      signInAnonymously: function () { return Promise.reject(new Error('auth unavailable')); },
      signOut: function () { return Promise.resolve(); }
    };
  }
  // ══════════════════════════════════════════════════════════════════════════
  // A RESTORED SESSION IS SAID OUT LOUD — browserLocalPersistence
  // ──────────────────────────────────────────────────────────────────────────
  // It is the SDK's web default, and relying on a default for the one behaviour
  // this whole pass is about is how "signed in yesterday, Join CTA today" gets
  // shipped twice. Named explicitly: the session lives in this browser's
  // storage, survives a reload, a new tab and a restart, and is restored BEFORE
  // the first onAuthStateChanged fires — which is what lets the chrome treat
  // "no event yet" as unknown rather than signed out. A failure here is not
  // fatal; the SDK keeps whatever default it had.
  try {
    if (auth && typeof auth.setPersistence === 'function' && typeof firebase !== 'undefined' &&
        firebase.auth && firebase.auth.Auth && firebase.auth.Auth.Persistence) {
      var _p = auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      if (_p && typeof _p.catch === 'function') {
        _p.catch(function (e) { console.warn('Auth persistence not set:', e && e.message); });
      }
    }
  } catch (e) {}

  // ══════════════════════════════════════════════════════════════════════════
  // THE AUTH BUS — one Firebase listener, many subscribers, none of them on
  // Firebase's own task
  // ──────────────────────────────────────────────────────────────────────────
  // WHAT WAS REPORTED. Signing in with Google — or simply returning to / with a
  // live session — put Chrome's "Page Unresponsive" dialog on screen. And after
  // /me → Home the bar showed JOIN THE PEOPLE for a long beat before the
  // account chip arrived, so a restore looked like a logout.
  //
  // WHY THE FREEZE. Firebase calls every registered onAuthStateChanged listener
  // SYNCHRONOUSLY, in ONE task, and this app has a dozen of them: the roster
  // warm below, the account pull, the local-store rehydrate that rebuilds six
  // grids and re-filters the directory, the alignment engine's Firestore
  // stream, the discussion cache drop (a document-wide querySelectorAll), the
  // desk, the district room, the evidence locker, the admin gate and two
  // lazy-module gates. One sign-in ran all of them back to back with no chance
  // to paint in between. That is not a slow page, it is a frozen tab.
  //
  // WHY THE FALSE LOGOUT. "We have not heard from Firebase yet" and "Firebase
  // says nobody is signed in" were the same value — null — so every reader of
  // it took the first for the second and painted a guest over a live member.
  //
  // WHAT THIS IS. auth.onAuthStateChanged is replaced by a dispatcher over ONE
  // real Firebase listener (attached at the bottom of this file). Each
  // announcement does two cheap things on Firebase's task — remember the
  // identity, paint the bar — and then hands every subscriber a task of its
  // own, so the browser paints between them and the Firebase callback itself
  // returns immediately. Callers are unchanged: same call, same unsubscribe,
  // and a late subscriber still receives the current state (one task later
  // rather than inline, which is what the SDK's own contract already allows).
  //
  // AND IT PUBLISHES THE THIRD STATE. window.PDXAuth.state is 'unknown' until
  // Firebase has answered once, then 'in' (a real account) or 'out' (null, or
  // the anonymous session the roster warm signs in — an anonymous uid is not an
  // account and never paints as one). Nothing may read 'unknown' as 'out'; see
  // updateNavAuth in compare-hub.js, which paints all three.
  //
  // WHAT IT IS NOT. Not a second auth stack, not a second source of truth, and
  // not a cache of the session: Firebase remains the only thing that decides
  // who is signed in, every subscriber still receives the SDK's own user object,
  // and no read anywhere is authorised by anything published here.
  // ══════════════════════════════════════════════════════════════════════════

  // Seeded by each shell's pre-SDK stub (see index.html); created here for a
  // shell that ships none.
  var PDXAuth = window.PDXAuth || { state: 'unknown', user: null, known: false };
  window.PDXAuth = PDXAuth;

  // Run fn on a task of its own — soon, but never on the caller's. Idle first
  // with a short deadline so the browser gets to paint before we take the
  // thread back; a timer backstop covers background tabs (where
  // requestIdleCallback does not fire at all) and queues that are never idle on
  // a page still compiling bundles. Whichever fires first makes the other a
  // no-op, so the work runs exactly once.
  function _pdxOffTask(fn) {
    var done = false;
    function go() {
      if (done) return;
      done = true;
      try { fn(); } catch (e) { console.error('Deferred auth work failed:', e && e.message); }
    }
    var idled = false;
    try {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(go, { timeout: 120 });
        idled = true;
      }
    } catch (e) {}
    setTimeout(go, idled ? 150 : 0);
  }
  window.PDXOffTask = _pdxOffTask;

  // The fan-out queue. ONE job per task: a subscriber that rebuilds a grid gets
  // its own slice, and the frame in between belongs to the browser.
  var _authSubs = [];
  var _authJobs = [];
  var _authPumping = false;
  function _authPump() {
    if (!_authJobs.length) { _authPumping = false; return; }
    var job = _authJobs.shift();
    _pdxOffTask(function () {
      try { job(); } catch (e) {}
      _authPump();
    });
  }
  function _authFanOut(jobs) {
    for (var i = 0; i < jobs.length; i++) _authJobs.push(jobs[i]);
    if (!_authPumping) { _authPumping = true; _authPump(); }
  }

  var _rawOnAuth = null;
  try {
    if (auth && typeof auth.onAuthStateChanged === 'function') {
      _rawOnAuth = auth.onAuthStateChanged.bind(auth);
    }
  } catch (e) {}

  // The dispatcher every caller in the app now registers against. Accepts the
  // SDK's own two shapes (a function, or an observer with .next) so no call
  // site has to change.
  function _pdxAuthSub(nextOrObserver) {
    var cb = null;
    if (typeof nextOrObserver === 'function') cb = nextOrObserver;
    else if (nextOrObserver && typeof nextOrObserver.next === 'function') {
      cb = function (u) { nextOrObserver.next(u); };
    }
    if (!cb) return function () {};
    var rec = { cb: cb, off: false };
    _authSubs.push(rec);
    if (PDXAuth.known) {
      _authFanOut([function () { if (!rec.off) rec.cb(PDXAuth.user); }]);
    }
    return function () {
      rec.off = true;
      var i = _authSubs.indexOf(rec);
      if (i >= 0) _authSubs.splice(i, 1);
    };
  }
  try { auth.onAuthStateChanged = _pdxAuthSub; } catch (e) {}

  // Replay whatever registered against the shell's pre-SDK stub while this file
  // was still downloading. The stub answered nobody (that was the bug); it
  // queued, and the unsubscribe it handed out stays live through rec.unsub.
  try {
    var _q = window.__pdxAuthQueue || [];
    window.__pdxAuthQueue = null;
    for (var _qi = 0; _qi < _q.length; _qi++) {
      var _rec = _q[_qi];
      if (_rec && !_rec.off && typeof _rec.cb === 'function') _rec.unsub = _pdxAuthSub(_rec.cb);
    }
  } catch (e) {}

  function setDoc(docRef, data, options) {
    return docRef.set(data, options);
  }

  // Global PROFILES object (dynamically populated from Firestore below)
  var PROFILES = {};
  window.PROFILES = PROFILES;

  // ══════════════════════════════════════════════════════════════════════════
  // ROSTER PHOTO CORRECTIONS — the one tier that outranks the live roster
  // ──────────────────────────────────────────────────────────────────────────
  // _getPhotoUrl() prefers PROFILES[pid].photo over every bundled tier, and that
  // order is right: Firestore is where a portrait gets repaired without a deploy.
  // It stops being right when the stored value is not a DEAD url but a DIFFERENT
  // PERSON. `kennedy` — Mike Kennedy, U.S. Representative for Utah's 3rd, Bioguide
  // K000403 — was filed with K000404, which is the Bioguide id of Kimberlyn
  // King-Hinds, the delegate for the Northern Mariana Islands. One digit, and an
  // image that loads: nothing downstream can tell it is wrong, no onerror fires,
  // the share card proxies it happily, and the letterhead on /p/kennedy printed
  // her face over his record. A wrong face on an accountability file is worse than
  // no face, because it is a claim.
  //
  // So this map is applied to every document as it lands — the light index, the
  // full-collection fallback and the lazy full fetch — which means PROFILES never
  // holds the wrong url and every reader of it is corrected at once: _getPhotoUrl,
  // the letterhead, the quick-view, the cards and the share card's proxy.
  //
  // THE RULES IT KEEPS. One entry per VERIFIED mis-identification, keyed to the
  // canonical pid (no second pid is created, and no alias is added). The url is an
  // official House/Clerk congressional portrait on a host already in the trusted
  // set — the same value BROWSE_PHOTOS carries for the same person, pinned to it
  // by scripts/test-photo-coverage.mjs so the two cannot drift. Nothing else about
  // the document is touched: name, office, party, district, tenure and every
  // formal-record field arrive exactly as the roster sent them.
  var PDX_PHOTO_FIX = {
    // UT-03 · Bioguide K000403. NOT K000404 (Kimberlyn King-Hinds, MP).
    kennedy: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000403.jpg'
  };
  window.PDX_PHOTO_FIX = PDX_PHOTO_FIX;
  // Applied on the object we are about to publish, never on a copy that is then
  // discarded. Returns the same object so it can wrap an assignment inline.
  function _pdxFixPhoto(id, obj) {
    try { if (obj && PDX_PHOTO_FIX[id]) obj.photo = PDX_PHOTO_FIX[id]; } catch (e) {}
    return obj;
  }
  window._pdxFixPhoto = _pdxFixPhoto;

  // ══════════════════════════════════════════════════════════════════════════
  // FAST FIRST LOAD — lightweight directory index + lazy full profiles
  // ──────────────────────────────────────────────────────────────────────────
  // The page used to block on db.collection("politicians").get() — every full
  // document (promises, voting records, Spotlight, detailed positions, …) had to
  // arrive before the first meaningful render. On mobile that meant a long blank
  // wait while megabytes of data the visitor doesn't need yet downloaded.
  //
  // Instead we now fetch only a LIGHTWEIGHT INDEX first: just the fields the
  // cards, filtering, search and "Best Match" need (name, photo, office,
  // district, scores, party, key issues, stances…). This uses the Firestore REST
  // API's field mask, which the compat client SDK can't do, so the payload is a
  // fraction of the size. The full document for any one politician is fetched on
  // demand — only when their medium modal or full profile is opened — and cached
  // in memory so the second open is instant. If anything about the lightweight
  // path fails, we transparently fall back to the original full-collection load,
  // so the page can never end up worse off than before.
  // ══════════════════════════════════════════════════════════════════════════

  // Ids whose FULL document is already in PROFILES (vs. just the lite stub), and
  // in-flight lazy fetches keyed by id so concurrent opens share one request.
  window._pdxFullIds = window._pdxFullIds || new Set();
  window._pdxFullPending = window._pdxFullPending || {};

  // The only fields pulled in the first (lightweight) pass. Everything heavy
  // (promises, sections/voting_record, spotlight, detailed positions, news…) is
  // deliberately omitted and lazy-loaded per profile. Requesting a field a given
  // document doesn't have is harmless — the mask simply omits it.
  var _PDX_LIGHT_FIELDS = [
    'name','office','district','state','party','score','kept','broken','pending',
    'tier','rank','icon','iconBg','iconBorder','photo','bio','issues','keyIssues',
    'stances','quote','tagline','summary','termStart','termEnd','accountability',
    'status','profileStatus','depth','color','candidate','incumbent','updatedAt'
  ];

  // Convert one Firestore REST "typed value" into a plain JS value.
  function _pdxRestVal(v) {
    if (v == null) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) { var n = parseInt(v.integerValue, 10); return isNaN(n) ? v.integerValue : n; }
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('mapValue' in v) {
      var o = {}, f = (v.mapValue && v.mapValue.fields) || {};
      for (var k in f) o[k] = _pdxRestVal(f[k]);
      return o;
    }
    if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(_pdxRestVal);
    if ('geoPointValue' in v) return v.geoPointValue;
    if ('referenceValue' in v) return v.referenceValue;
    return null;
  }

  // Resolve an auth token the same way the client SDK would, so the REST call is
  // authorized identically to the old .get() (which waited for anonymous sign-in
  // before issuing the read). We wait for the FIRST signed-in user — anonymous or
  // real — rather than the first null state, then read its ID token. A safety
  // timeout means we never block the page indefinitely; on timeout we fall
  // through with no token (works if the collection is publicly readable, and the
  // full-collection fallback covers the case where it isn't).
  function _pdxAuthToken() {
    return new Promise(function (resolve) {
      var done = false;
      function fin(t) { if (!done) { done = true; resolve(t || null); } }
      try {
        if (auth.currentUser) { auth.currentUser.getIdToken().then(fin, function () { fin(null); }); return; }
        var unsub = auth.onAuthStateChanged(function (u) {
          if (u) { try { unsub(); } catch (e) {} u.getIdToken().then(fin, function () { fin(null); }); }
        });
        setTimeout(function () { fin(null); }, 5000);
      } catch (e) { fin(null); }
    });
  }

  function _pdxIndexUrl(pageToken) {
    var base = 'https://firestore.googleapis.com/v1/projects/' +
      firebaseConfig.projectId + '/databases/(default)/documents/politicians';
    var params = ['pageSize=300', 'key=' + encodeURIComponent(firebaseConfig.apiKey)];
    _PDX_LIGHT_FIELDS.forEach(function (f) { params.push('mask.fieldPaths=' + encodeURIComponent(f)); });
    if (pageToken) params.push('pageToken=' + encodeURIComponent(pageToken));
    return base + '?' + params.join('&');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE HOMEPAGE'S PATCH IS NOT A DEPENDENCY OF THIS FILE
  // ──────────────────────────────────────────────────────────────────────────
  // index.html, person.html, issue.html and me.html each open with the same
  // block: it replaces document.addEventListener so DOMContentLoaded listeners
  // can be held back until Firestore answers, keeps the real function in the
  // bare global `_originalAddEventListener`, and releases the queue through
  // `_checkAndTrigger`. This file read both by name.
  //
  // Those are BARE reads, not window properties, so on a shell that loads
  // firebase-boot.js without that block they are ReferenceErrors, and one of
  // them was thrown at top level. /evidence is that shell: the throw landed
  // above auth.onAuthStateChanged, so the document never signed in
  // anonymously, _pdxLoadDirectoryIndex() was never kicked, and the Evidence
  // Locker was left waiting on a roster nothing had asked for.
  //
  // So the dependency inverts and this file fails closed. Both helpers resolve
  // the homepage's function at CALL time and do the honest thing without it:
  //
  //  · _pdxAtDomReady falls back to document's own addEventListener, which on
  //    an unpatched shell IS the undeferred one this call wants. It also runs
  //    the callback straight away when readyState is already past 'loading',
  //    because a deferred script that lands after DOMContentLoaded would
  //    otherwise register for an event that has been and gone.
  //  · _pdxReleaseDeferred does nothing when there is no queue to release,
  //    which is the correct answer on a document that never deferred anything
  //    — rather than throwing midway through a roster callback and leaving the
  //    rest of it, _pdxRenderRosterStatus() included, unrun.
  //
  // A shell that DOES install the block is unaffected: the typeof check finds
  // the real function and the deferred gate works exactly as it always did.
  // ══════════════════════════════════════════════════════════════════════════
  function _pdxAtDomReady(fn) {
    try {
      if (document.readyState && document.readyState !== 'loading') { fn(); return; }
      var ael = (typeof _originalAddEventListener === 'function')
        ? _originalAddEventListener : document.addEventListener;
      ael.call(document, 'DOMContentLoaded', fn);
    } catch (e) {
      try { fn(); } catch (e2) {}
    }
  }
  function _pdxReleaseDeferred() {
    try {
      if (typeof _checkAndTrigger === 'function') _checkAndTrigger();
    } catch (e) {
      console.error('Deferred DOMContentLoaded release failed:', e && e.message);
    }
  }

  // Fetch the lightweight index (paginated). Populates PROFILES with lite stubs
  // (flagged __lite) and flips _firestoreLoaded as soon as it's all in.
  function _pdxLoadDirectoryIndex() {
    window._pdxRosterState = 'loading';
    _pdxRenderRosterStatus();
    _pdxAuthToken().then(function (tok) {
      var headers = tok ? { Authorization: 'Bearer ' + tok } : {};
      var count = 0;
      function page(token) {
        return fetch(_pdxIndexUrl(token), { headers: headers }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function (data) {
          (data.documents || []).forEach(function (doc) {
            var id = doc.name.split('/').pop();
            var fields = doc.fields || {};
            var obj = {};
            for (var k in fields) obj[k] = _pdxRestVal(fields[k]);
            obj.__lite = true;
            PROFILES[id] = _pdxFixPhoto(id, obj);
            count++;
          });
          if (data.nextPageToken) return page(data.nextPageToken);
        });
      }
      return page(null).then(function () {
        if (count === 0) throw new Error('empty index');
        console.log('📥 Loaded lightweight politician index. Count:', count);
        window._pdxRosterState = 'done';
        _pdxRenderRosterStatus();
        _firestoreLoaded = true;
        _pdxReleaseDeferred();
      });
    }).catch(function (err) {
      console.warn('⚠️ Lightweight index unavailable, falling back to full load:', err && err.message);
      _pdxLoadFullCollection();
    });
  }

  // Fallback: the original behavior — fetch the entire collection via the client
  // SDK. Every doc that arrives this way is already complete, so it's marked full
  // and never lazy-fetched again.
  function _pdxLoadFullCollection() {
    if (typeof db === 'undefined' || !db.collection) {
      window._pdxRosterState = 'error'; _pdxRenderRosterStatus();
      _firestoreLoaded = true; _pdxReleaseDeferred();
      return;
    }
    db.collection('politicians').get().then(function (querySnapshot) {
      console.log('📥 Fetched full politicians collection (fallback). Count:', querySnapshot.size);
      querySnapshot.forEach(function (doc) {
        PROFILES[doc.id] = _pdxFixPhoto(doc.id, doc.data());
        window._pdxFullIds.add(doc.id);
      });
      window._pdxRosterState = 'done'; _pdxRenderRosterStatus();
      _firestoreLoaded = true;
      _pdxReleaseDeferred();
    }).catch(function (error) {
      console.error('❌ Error loading politicians from Firestore:', error);
      window._pdxRosterState = 'error'; _pdxRenderRosterStatus();
      _firestoreLoaded = true;
      _pdxReleaseDeferred();
    });
  }

  // Lazy-load (and cache) the FULL document for one politician. Returns a promise
  // that resolves to the full profile object. Safe to call repeatedly: already-
  // full ids resolve immediately, concurrent calls share one request, and a
  // failed fetch resolves to whatever (stub) data we already have so the caller
  // never dead-ends.
  window._pdxEnsureFullProfile = function (id) {
    if (!id) return Promise.resolve(null);
    if (window._pdxFullIds.has(id)) return Promise.resolve(PROFILES[id] || null);
    if (window._pdxFullPending[id]) return window._pdxFullPending[id];
    if (typeof db === 'undefined' || !db.collection) {
      window._pdxFullIds.add(id);
      return Promise.resolve(PROFILES[id] || null);
    }
    var pr = db.collection('politicians').doc(id).get().then(function (doc) {
      if (doc.exists) {
        var full = doc.data() || {};
        var merged = Object.assign({}, PROFILES[id] || {}, full);
        delete merged.__lite;
        // Mirror the issues normalization done for the bulk load so renderers
        // that expect p.issues to be an array never crash.
        var rawIssues = merged.issues || merged.keyIssues || [];
        if (!Array.isArray(rawIssues)) {
          merged.issues = (typeof rawIssues === 'string')
            ? rawIssues.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
            : [];
        } else {
          merged.issues = rawIssues;
        }
        PROFILES[id] = _pdxFixPhoto(id, merged);
        if (typeof CMP_DATA !== 'undefined') {
          // A RETIRED ID MAY NOT BECOME A ROSTER ENTRY.
          //
          // This line is where one Scott Chew became two. `scott_chew` has no
          // cmp-data.js record — it is the slug of chew_h68's display name, and
          // PDX_PROFILE_ALIAS has said so the whole time. But it DOES have a
          // Firestore document, so the first surface to lazy-load it (the
          // Evidence Locker warms every Utah legislator it finds in PROFILES)
          // landed here, found no CMP_DATA entry, and created one. From that
          // moment the retired key was in the roster itself, and every
          // Object.keys(CMP_DATA) list in the app — the browse grid, the compare
          // add-column, the state filter, My Team, the ballot breakdown — was
          // correctly rendering what it had been handed: a second officeholder
          // for Utah House District 68.
          //
          // So the roster stays closed to ids the app has already ruled are
          // addresses. The document is NOT discarded: PROFILES[id] above still
          // holds it, /p/scott_chew still opens chew_h68's file, and every read
          // that goes through PDXProfilePid still finds it. What it can no longer
          // do is enter the roster and be counted as a person.
          //
          // Updating an id that IS already in CMP_DATA is untouched — that branch
          // is a live roster record receiving its own full document, which is the
          // whole point of this function.
          // A blank never overwrites a curated field; see _pdxMergeRosterRecord.
          if (CMP_DATA[id]) {
            if (typeof _pdxMergeRosterRecord === 'function') _pdxMergeRosterRecord(CMP_DATA[id], full);
            else Object.assign(CMP_DATA[id], full);
          } else if (!(typeof window.PDXRetiredPid === 'function' && window.PDXRetiredPid(id))) {
            CMP_DATA[id] = merged;
          }
        }
      }
      window._pdxFullIds.add(id);
      delete window._pdxFullPending[id];
      // Newly arrived depth invalidates the memoized search text. It used to
      // invalidate window._acctMatchCacheBust too — the memo behind the retired
      // Accountability of Truth composite, which ranked the browse roster. That
      // memo and its buster are gone; see alignment-tool.js.
      if (typeof window._pdxClearHayCache === 'function') window._pdxClearHayCache();
      // …and every derived read of this profile. One of the two places the data
      // under the scoring lanes can actually change; see THE DERIVATION EPOCH in
      // stance-helpers.js. Bumped even when the doc did not exist, because
      // _pdxFullIds just changed and a caller may branch on it.
      if (typeof window.PDXDataChanged === 'function') window.PDXDataChanged();
      return PROFILES[id] || null;
    }).catch(function (e) {
      delete window._pdxFullPending[id];
      console.warn('Lazy profile load failed for', id, e && e.message);
      return PROFILES[id] || null; // fall back to the lite stub
    });
    window._pdxFullPending[id] = pr;
    return pr;
  };

  // ── Roster loading / error status pill ───────────────────────────────────
  // A small, unobtrusive status line. Driven entirely by this loader (not by any
  // section renderer) so it's reliable regardless of which grids exist yet. It
  // renders lazily once <body> is available; the loader and the real
  // DOMContentLoaded both call the renderer, whichever wins.
  window._pdxRosterState = 'loading';
  // One exception to the pill, and it is about honesty rather than polish. A
  // judge file is served entirely from judicial-data.js, which ships with the
  // page: nothing on /p/<a judge> is waiting on the legislator roster, so a
  // "Loading the latest roster…" spinner over it is a promise of a record that
  // is never coming. Worse, it reads as though the file is half-built and the
  // missing half is a voting history — the exact inference the whole judicial
  // surface exists to prevent. So the loading pill is suppressed while a
  // judicial pid is open. The error pill is NOT: "couldn't load the roster" is
  // a true report about the rest of the app, and its Retry button still works.
  function _pdxJudicialFileOpen() {
    try {
      var pid = '';
      var m = String(location.pathname || '').match(/^\/p\/([^\/?#]+)/);
      if (m) pid = decodeURIComponent(m[1]);
      if (!pid) pid = String(window._pdxCurrentProfileId || '');
      if (!pid) return false;
      var J = window.PDXJudicial;
      if (J && typeof J.isJudge === 'function') return !!J.isJudge(pid);
      var raw = window.PDX_JUDICIAL && window.PDX_JUDICIAL.JUDGES;
      return !!(raw && raw[pid]);
    } catch (e) { return false; }
  }
  // THE LOADING PILL IS BOUNDED. It is a fixed, bottom-centre overlay at
  // z-index 9000, so for as long as it is up it sits on top of whatever the
  // reader has scrolled to. That was a fair trade while the front page's own
  // content waited on this roster: the spinner explained the wait. It stopped
  // being fair when the homepage stopped waiting — the ballot band and the issue
  // strip are static markup and paint from the shell, so a reader looking at
  // either of them is not waiting for anything the pill describes, and a slow or
  // stalled directory fetch left a spinner parked over content that had already
  // arrived. So the spinner now retires itself after a grace period.
  //
  // WHAT IS NOT BOUNDED, DELIBERATELY. The ERROR pill. "Couldn't load the
  // roster" is a true report about the rest of the app and it carries the Retry
  // button, so it stays until the roster loads or the reader acts. Retiring the
  // spinner does not cancel, fail or alter the load either — nothing about
  // _pdxRosterState changes here, so whichever way the fetch resolves still
  // repaints normally. This only stops the WAITING from being shown forever.
  var ROSTER_PILL_MS = 6000;
  var _rosterPillTimer = null;
  var _rosterPillRetired = false;
  function _pdxRenderRosterStatus() {
    if (!document || !document.body) return;
    var el = document.getElementById('pdx-roster-status');
    var st = window._pdxRosterState;
    if (st === 'loading' && _pdxJudicialFileOpen()) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      return;
    }
    // Two different reasons to take the spinner down, kept as two checks: the
    // one above is "this reader is not waiting on the roster at all", and this
    // one is "they were, and it has been long enough that saying so is no longer
    // information".
    if (st === 'loading' && _rosterPillRetired) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      return;
    }
    if (st === 'loading') {
      if (!el) {
        el = document.createElement('div');
        el.id = 'pdx-roster-status';
        document.body.appendChild(el);
      }
      el.className = 'pdx-roster-status';
      el.innerHTML = '<span class="pdx-roster-spin" aria-hidden="true"></span>' +
        '<span>Loading the latest roster…</span>';
      if (_rosterPillTimer === null) {
        _rosterPillTimer = setTimeout(function () {
          _rosterPillTimer = null;
          _rosterPillRetired = true;
          if (window._pdxRosterState === 'loading') _pdxRenderRosterStatus();
        }, ROSTER_PILL_MS);
      }
    } else if (st === 'error') {
      if (!el) {
        el = document.createElement('div');
        el.id = 'pdx-roster-status';
        document.body.appendChild(el);
      }
      el.className = 'pdx-roster-status is-error';
      el.innerHTML = '<span>⚠️ Couldn’t load the roster.</span>' +
        '<button type="button" onclick="window._pdxRetryRoster()">Retry</button>';
    } else {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  }
  // Exposed so the judge file can re-run the decision after it takes over the
  // address: the pill may already be on screen from the boot path, and the
  // judicial registry is deferred, so the first call can happen before either
  // the pid or PDXJudicial exists.
  window._pdxRenderRosterStatus = _pdxRenderRosterStatus;
  window._pdxRetryRoster = function () {
    window._pdxRosterState = 'loading';
    // A retry is the reader asking for this load, so the spinner is theirs again
    // and gets a fresh grace period rather than being suppressed by the earlier
    // one's expiry.
    if (_rosterPillTimer !== null) { clearTimeout(_rosterPillTimer); _rosterPillTimer = null; }
    _rosterPillRetired = false;
    _pdxRenderRosterStatus();
    _pdxLoadDirectoryIndex();
  };

  // Skeleton placeholder cards shown in the main "Relevant to Me" grid while the
  // index loads, so the page reads as alive-and-loading rather than empty. The
  // real render replaces the grid's innerHTML, clearing these automatically.
  function _pdxSkeletonCardsHtml(n) {
    var cards = '';
    for (var i = 0; i < (n || 6); i++) {
      cards += '<div class="pdx-skel-card">' +
          '<div class="pdx-skel-row"><span class="pdx-skel skeleton pdx-skel-ava"></span>' +
            '<span class="pdx-skel-lines"><span class="pdx-skel skeleton pdx-skel-line w70"></span>' +
            '<span class="pdx-skel skeleton pdx-skel-line w40"></span></span></div>' +
          '<span class="pdx-skel skeleton pdx-skel-bar"></span>' +
          '<span class="pdx-skel skeleton pdx-skel-line w90"></span>' +
          '<span class="pdx-skel skeleton pdx-skel-line w60"></span>' +
        '</div>';
    }
    return '<div class="pdx-skel-grid">' + cards + '</div>';
  }
  function _pdxInjectSkeletons() {
    if (window._pdxRosterState !== 'loading') return;
    var grid = document.getElementById('relevant-browse-grid');
    if (grid && !grid.children.length) grid.innerHTML = _pdxSkeletonCardsHtml(6);
  }
  // Use the ORIGINAL (non-deferred) addEventListener so this fires at real DOM
  // ready, before the data-gated deferred renderers run.
  _pdxAtDomReady(function () {
    _pdxRenderRosterStatus();
    _pdxInjectSkeletons();
  });

  // Kick off the fast path.
  _pdxLoadDirectoryIndex();

  var _fbAuthResolve;
  var _fbAuthReady = new Promise(function(resolve) {
    _fbAuthResolve = resolve;
  });

  // Cache the latest non-anonymous user so the nav account indicator can be
  // re-rendered reliably even if Firebase resolves the auth state before
  // updateNavAuth() is defined further down the page (avoids a blank nav).
  var _lastAuthUser = null;

  // ── WHAT AN ANNOUNCEMENT IS ALLOWED TO COST ──────────────────────────────
  // This function IS the Firebase callback, so everything it does inline is
  // done before the browser is allowed to paint again. Exactly three things
  // qualify, and all three are the reader's own answer rather than the app's
  // bookkeeping:
  //
  //   · publish the state, so no later reader has to guess it;
  //   · remember the identity for the NEXT cold start's 'unknown' chip;
  //   · paint the bar.
  //
  // Everything else — the account pull, the local rehydrate, the sync switch,
  // the votes listener, the comment counts, and every other module's listener —
  // is a job, one task each, through the bus. The callback returns in
  // microseconds and the tab keeps painting while the work lands behind it.
  function _pdxAuthAnnounce(user) {
    PDXAuth.known = true;
    PDXAuth.user = user || null;
    PDXAuth.state = (user && !user.isAnonymous) ? 'in' : 'out';
    _lastAuthUser = (PDXAuth.state === 'in') ? user : null;
    try {
      if (typeof window.PDXRememberAccount === 'function') window.PDXRememberAccount(_lastAuthUser);
    } catch (e) {}
    try {
      if (typeof updateNavAuth === 'function') updateNavAuth(PDXAuth.user, PDXAuth.state);
    } catch (e) {}
    try { if (typeof _fbAuthResolve === 'function') _fbAuthResolve(); } catch (e) {}

    var jobs = _pdxAuthOwnJobs(user);
    _authSubs.slice().forEach(function (rec) {
      jobs.push(function () { if (!rec.off) rec.cb(user); });
    });
    _authFanOut(jobs);
  }

  // This file's OWN reaction to a session, as a list of jobs rather than one
  // straight line. Every step is the step it always was, with the same guards
  // in the same order; the only change is that each gets a task of its own so
  // no single one of them can hold the frame. _loadLocalUserData in particular
  // rebuilds three grids, refreshes every heart on the page and re-filters the
  // whole directory — that is the sync walk the report was about, and it is no
  // longer on the click.
  function _pdxAuthOwnJobs(user) {
    var jobs = [];
    if (user) {
      if (user.isAnonymous) {
        jobs.push(function () {
          console.log("Firebase signed in anonymously:", user.uid);
          // Guest/anonymous visitors have no saved cloud profile, so their My Team,
          // Favorites and Watching lists live entirely in this browser's
          // localStorage. Reading the (empty) anonymous Firestore profile here would
          // overwrite a team the visitor already built on this device — the bug that
          // made "My Team" appear to reset on every refresh. Load from localStorage
          // instead so selections persist across refreshes and browser sessions.
          if (typeof window._loadLocalUserData === 'function') window._loadLocalUserData();
        });
        jobs.push(function () {
          // Anonymous = local-only for PDX sync too: an anonymous uid is per-browser
          // and ephemeral, so we never sync it (the server rejects it anyway).
          try { if (window.PDXStore) window.PDXStore.disableAccountSync(); } catch (e) {}
        });
      } else {
        jobs.push(function () {
          console.log("Firebase signed in as user:", user.uid, user.email);
          if (typeof syncUserDataFromFirestore === 'function') syncUserDataFromFirestore(user.uid);
        });
        jobs.push(function () {
          // Real account → turn on authenticated cross-device sync of 'saved'.
          // getToken returns a fresh Firebase ID token for the Authorization header;
          // getIdToken() transparently refreshes it when it's near expiry.
          try {
            if (window.PDXStore) window.PDXStore.enableAccountSync({
              userId: user.uid,
              getToken: function () {
                var u = auth.currentUser;
                return u ? u.getIdToken().catch(function () { return null; })
                         : Promise.resolve(null);
              }
            });
          } catch (e) {}
        });
      }
    } else {
      jobs.push(function () {
        console.log("No user, signing in anonymously...");
        // Signed out → back to local-only until a real account signs in again.
        try { if (window.PDXStore) window.PDXStore.disableAccountSync(); } catch (e) {}
        try {
          auth.signInAnonymously().catch(function (e) {
            console.warn("Firebase anon auth failed:", e && e.message);
          });
        } catch (e) {}
      });
    }
    jobs.push(function () { if (typeof _startVotesListener === 'function') _startVotesListener(); });
    jobs.push(function () { if (typeof _loadCommentCounts === 'function') _loadCommentCounts(); });
    return jobs;
  }

  // THE ONE REAL LISTENER. Everything else in the app registers against the bus
  // installed at the top of this file, which is why this is the only call to the
  // SDK's own onAuthStateChanged left anywhere.
  if (_rawOnAuth) {
    _rawOnAuth(function (user) { _pdxAuthAnnounce(user); });
  } else {
    // No SDK at all (init threw, or firebase never loaded). That is a genuine
    // "nobody is signed in" rather than an unknown, and saying so is what keeps
    // the chrome from parking on "Checking account…" forever.
    _pdxAuthAnnounce(null);
  }
