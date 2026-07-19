
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
  function setDoc(docRef, data, options) {
    return docRef.set(data, options);
  }

  // Global PROFILES object (dynamically populated from Firestore below)
  var PROFILES = {};
  window.PROFILES = PROFILES;

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
            PROFILES[id] = obj;
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
        _checkAndTrigger();
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
      _firestoreLoaded = true; _checkAndTrigger();
      return;
    }
    db.collection('politicians').get().then(function (querySnapshot) {
      console.log('📥 Fetched full politicians collection (fallback). Count:', querySnapshot.size);
      querySnapshot.forEach(function (doc) {
        PROFILES[doc.id] = doc.data();
        window._pdxFullIds.add(doc.id);
      });
      window._pdxRosterState = 'done'; _pdxRenderRosterStatus();
      _firestoreLoaded = true;
      _checkAndTrigger();
    }).catch(function (error) {
      console.error('❌ Error loading politicians from Firestore:', error);
      window._pdxRosterState = 'error'; _pdxRenderRosterStatus();
      _firestoreLoaded = true;
      _checkAndTrigger();
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
        PROFILES[id] = merged;
        if (typeof CMP_DATA !== 'undefined') {
          if (!CMP_DATA[id]) CMP_DATA[id] = merged;
          else Object.assign(CMP_DATA[id], full);
        }
      }
      window._pdxFullIds.add(id);
      delete window._pdxFullPending[id];
      // Newly arrived depth invalidates memoized search text & accountability.
      if (typeof window._pdxClearHayCache === 'function') window._pdxClearHayCache();
      if (typeof window._acctMatchCacheBust === 'function') window._acctMatchCacheBust(id);
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
  function _pdxRenderRosterStatus() {
    if (!document || !document.body) return;
    var el = document.getElementById('pdx-roster-status');
    var st = window._pdxRosterState;
    if (st === 'loading') {
      if (!el) {
        el = document.createElement('div');
        el.id = 'pdx-roster-status';
        document.body.appendChild(el);
      }
      el.className = 'pdx-roster-status';
      el.innerHTML = '<span class="pdx-roster-spin" aria-hidden="true"></span>' +
        '<span>Loading the latest roster…</span>';
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
  window._pdxRetryRoster = function () {
    window._pdxRosterState = 'loading';
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
  _originalAddEventListener.call(document, 'DOMContentLoaded', function () {
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

  auth.onAuthStateChanged(function(user) {
    _fbAuthResolve();
    if (user) {
      _lastAuthUser = user.isAnonymous ? null : user;
      if (typeof updateNavAuth === 'function') updateNavAuth(user);
      if (user.isAnonymous) {
        console.log("Firebase signed in anonymously:", user.uid);
        // Guest/anonymous visitors have no saved cloud profile, so their My Team,
        // Favorites and Watching lists live entirely in this browser's
        // localStorage. Reading the (empty) anonymous Firestore profile here would
        // overwrite a team the visitor already built on this device — the bug that
        // made "My Team" appear to reset on every refresh. Load from localStorage
        // instead so selections persist across refreshes and browser sessions.
        if (typeof window._loadLocalUserData === 'function') window._loadLocalUserData();
        // Anonymous = local-only for PDX sync too: an anonymous uid is per-browser
        // and ephemeral, so we never sync it (the server rejects it anyway).
        try { if (window.PDXStore) window.PDXStore.disableAccountSync(); } catch (e) {}
      } else {
        console.log("Firebase signed in as user:", user.uid, user.email);
        if (typeof syncUserDataFromFirestore === 'function') syncUserDataFromFirestore(user.uid);
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
      }
    } else {
      _lastAuthUser = null;
      console.log("No user, signing in anonymously...");
      if (typeof updateNavAuth === 'function') updateNavAuth(null);
      // Signed out → back to local-only until a real account signs in again.
      try { if (window.PDXStore) window.PDXStore.disableAccountSync(); } catch (e) {}
      auth.signInAnonymously().catch(function(e) {
        console.warn("Firebase anon auth failed:", e.message);
      });
    }
    if (typeof _startVotesListener === 'function') _startVotesListener();
    if (typeof _loadCommentCounts === 'function') _loadCommentCounts();
  });
