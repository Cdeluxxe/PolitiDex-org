// ─────────────────────────────────────────────────────────────────────────────
// My Stances — the signed-in visitor's OWN positions on the issues
// ─────────────────────────────────────────────────────────────────────────────
// The mirror image of the Stance Library: that surface shows where POLITICIANS
// stand; this one is where YOU stand. A voter browses the exact same issue
// vocabulary every other PolitiDex surface uses (window.ISSUE_MAP, grouped by
// window.CORE_NATIONAL_ISSUES), takes a Support / Oppose / Mixed position, sets a
// priority, and can leave a private note.
//
// DESIGN — additive, and deeply wired into what already exists:
//   • It OWNS its data as a first-class personal collection ('stances') on
//     window.PDXStore, so it is local-first and syncs to the visitor's Firebase
//     account through the same /api/pdx-sync backend as My Team, Saved evidence,
//     Evidence collections and the Impact Tracker. No new table — a snapshot is
//     one opaque JSON row keyed by (uid, collection).
//   • Every saved stance PROJECTS into the Alignment Signature the scoring engine
//     already reads (window.alignSetIntensity / window.alignToggleIssue). That is
//     the whole integration in one move: the moment you set a stance, every
//     politician's match %, the "Compare My Team" table, the Relevant-to-Me grid
//     and the on-profile comparison update — because they all already read that
//     signature. My Stances is a richer editing surface + record ON TOP of it.
//   • It ADOPTS an existing Alignment Signature on first load, so a voter who
//     already tuned the Alignment Tool sees those positions here as real stances,
//     and the two can never silently diverge.
//   • Setting a position on a fresh issue records a private civic action in the
//     Personal Impact Tracker (window.PDXImpact.record('issues', key)).
//   • Private by default. An explicit, user-controlled toggle publishes a
//     notes-free summary to the account's Firestore user doc for future public
//     showcasing; flipping it back off clears that snapshot.
//
// NEUTRALITY — this file writes NO editorial content. It renders the issue's own
// label and plain-language description (the ISSUE_MAP `chip`), and records only
// what the user chose. Nothing here nudges a direction.
//
// Public API: window.PDXStances (see the assignment at the bottom).
(function () {
  'use strict';
  if (window.PDXStances) return; // idempotent — never redefine

  // ── Constants ─────────────────────────────────────────────────────────────
  var KEY = 'pdx_my_stances_v1';   // localStorage key this collection owns
  var COLLECTION = 'stances';      // PDXStore / pdx-sync collection name
  var MOUNT = 'ms-body';           // the #ms-body container inside #my-stances
  var VERSION = 1;

  // Firestore fields on users/{uid} for the optional public showcase. Notes are
  // NEVER included — only the direction/priority summary the user chose to share.
  var FS_PUBLIC_FLAG = 'stancesPublic';
  var FS_PUBLIC_DATA = 'publicStances';
  var FS_PUBLIC_AT = 'publicStancesUpdatedAt';

  // The three positions a voter can take, in the order they render. `pol` is the
  // matching value in a politician's documented `issueStance`, so the two speak
  // the same four-state vocabulary the rest of the app uses.
  var POSITIONS = [
    { key: 'support', label: 'Support', icon: '👍', cls: 'is-support' },
    { key: 'oppose', label: 'Oppose', icon: '👎', cls: 'is-oppose' },
    { key: 'mixed', label: 'Mixed', icon: '⚖️', cls: 'is-mixed' }
  ];
  var POSITION_LABEL = { support: 'Support', oppose: 'Oppose', mixed: 'Mixed' };

  // Priority is the voter's own weighting. It maps onto the Alignment engine's
  // 5-point intensity scale: a High-priority Support becomes "Strongly Support",
  // so it counts more heavily in every match %.
  var PRIORITIES = [
    { key: 'high', label: 'High priority', short: 'High', icon: '⭐' },
    { key: 'medium', label: 'Normal priority', short: 'Normal', icon: '•' },
    { key: 'low', label: 'Low priority', short: 'Low', icon: '·' }
  ];
  var PRIORITY_LABEL = { high: 'High', medium: 'Normal', low: 'Low' };

  // ── Small utilities ─────────────────────────────────────────────────────────
  function now() { return Date.now(); }
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function store() { return (typeof window !== 'undefined' && window.PDXStore) ? window.PDXStore : null; }
  function issueMap() { return (window.ISSUE_MAP && typeof window.ISSUE_MAP === 'object') ? window.ISSUE_MAP : {}; }
  function coreIssues() { return Array.isArray(window.CORE_NATIONAL_ISSUES) ? window.CORE_NATIONAL_ISSUES : []; }
  function knownIssue(k) { return !!issueMap()[k]; }

  // ── Public share link (self-contained, no backend) ─────────────────────────
  // The showcase is made viewable by OTHERS the same way My Team sharing works:
  // the notes-free public summary is packed into a URL token, so anyone who opens
  // the link sees a read-only "My Views" card. This deliberately needs no server
  // and no cross-user database read — it can't leak anything the owner didn't put
  // in the link, and NOTES ARE NEVER INCLUDED. `?views=` carries the token.
  var SHARE_PARAM = 'views';
  function b64urlEncode(str) {
    try { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    catch (e) { return ''; }
  }
  function b64urlDecode(tok) {
    try {
      var b64 = String(tok).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return decodeURIComponent(escape(atob(b64)));
    } catch (e) { return ''; }
  }
  // The signed-in member's display name (or a neutral fallback). Only ever used as
  // a label on the public card — never an email address or uid.
  function displayName() {
    var u = fbUser();
    if (u) return (u.displayName || (u.email ? u.email.split('@')[0] : '') || 'A PolitiDex member').toString().slice(0, 60);
    return 'A PolitiDex member';
  }
  // Compact public payload: position → first letter, priority → first letter, and
  // NO note field at all. { v, n:name, s:[{i:issueKey, p:'s|o|m', r:'h|m|l'}] }
  function publicToken(s) {
    s = s || load();
    var payload = { v: 1, n: displayName(), s: activeItems(s).map(function (r) {
      return { i: r.issueKey, p: r.position.charAt(0), r: r.priority.charAt(0) };
    }) };
    return b64urlEncode(JSON.stringify(payload));
  }
  function decodeViews(tok) {
    var raw = b64urlDecode(tok);
    if (!raw) return null;
    var obj;
    try { obj = JSON.parse(raw); } catch (e) { return null; }
    if (!obj || typeof obj !== 'object') return null;
    var posMap = { s: 'support', o: 'oppose', m: 'mixed' };
    var priMap = { h: 'high', m: 'medium', l: 'low' };
    var arr = Array.isArray(obj.s) ? obj.s : [];
    var items = [];
    arr.forEach(function (it) {
      if (!it || !knownIssue(it.i)) return;
      var pos = posMap[it.p] || it.position;
      if (pos !== 'support' && pos !== 'oppose' && pos !== 'mixed') return;
      items.push({ issueKey: it.i, position: pos, priority: priMap[it.r] || 'medium' });
    });
    return { name: (obj.n || 'A PolitiDex member').toString().slice(0, 60), items: items };
  }
  function shareUrl(s) {
    var tok = publicToken(s);
    if (!tok) return '';
    return location.origin + location.pathname + '?' + SHARE_PARAM + '=' + tok + '#my-stances';
  }
  function copyShareLink() {
    var s = load();
    if (!s.settings.public) return;
    var url = shareUrl(s);
    if (!url) return;
    function done(ok) { toast(ok ? '🔗 Share link copied — anyone who opens it sees your public views.' : 'Couldn’t copy — here’s your link: ' + url); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); return; }
    } catch (e) {}
    try {
      var ta = document.createElement('textarea'); ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done(true);
    } catch (e2) { done(false); }
  }
  function toast(msg) {
    var t = el('ms-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ms-toast'; t.className = 'ms-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('is-show'); }, 3200);
  }

  // ── State model ───────────────────────────────────────────────────────────
  // { version, updatedAt, settings:{public, publicUpdatedAt},
  //   items: { issueKey: {issueKey, position, priority, note, createdAt, updatedAt} },
  //   tombstones: { issueKey: deletedAtMs } }
  function blank() {
    return { version: VERSION, updatedAt: 0, settings: { public: false, publicUpdatedAt: 0 }, items: {}, tombstones: {} };
  }

  function normalize(raw) {
    var s = blank();
    if (!raw || typeof raw !== 'object') return s;
    s.updatedAt = (typeof raw.updatedAt === 'number' && raw.updatedAt > 0) ? raw.updatedAt : 0;
    if (raw.settings && typeof raw.settings === 'object') {
      s.settings.public = !!raw.settings.public;
      s.settings.publicUpdatedAt = (typeof raw.settings.publicUpdatedAt === 'number') ? raw.settings.publicUpdatedAt : 0;
    }
    var items = (raw.items && typeof raw.items === 'object') ? raw.items : {};
    Object.keys(items).forEach(function (k) {
      var r = items[k] || {};
      if (!k) return;
      var pos = (r.position === 'support' || r.position === 'oppose' || r.position === 'mixed') ? r.position : null;
      if (!pos) return; // an item with no position is not a stance
      var prio = (r.priority === 'high' || r.priority === 'medium' || r.priority === 'low') ? r.priority : 'medium';
      s.items[k] = {
        issueKey: k,
        position: pos,
        priority: prio,
        note: typeof r.note === 'string' ? r.note.slice(0, 2000) : '',
        createdAt: (typeof r.createdAt === 'number' && r.createdAt > 0) ? r.createdAt : (r.updatedAt || 0),
        updatedAt: (typeof r.updatedAt === 'number' && r.updatedAt > 0) ? r.updatedAt : 0
      };
    });
    var tombs = (raw.tombstones && typeof raw.tombstones === 'object') ? raw.tombstones : {};
    Object.keys(tombs).forEach(function (k) {
      var t = tombs[k];
      if (typeof t === 'number' && t > 0) s.tombstones[k] = t;
    });
    return s;
  }

  function load() {
    var st = store();
    if (st && typeof st.read === 'function') return normalize(st.read(KEY, null));
    try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return blank(); }
  }

  // Persist. dirty !== false marks the collection for a sync push; a merge coming
  // down from another device writes with dirty:false so it doesn't re-push itself.
  function save(s, dirty) {
    s.version = VERSION;
    var st = store();
    if (st && typeof st.write === 'function') {
      st.write(KEY, s, { collection: COLLECTION, dirty: dirty !== false });
    } else {
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    }
  }

  // ── Live, sanitized list of the visitor's stances (only issues that still
  //    exist in ISSUE_MAP and aren't tombstoned newer than they were edited). ──
  function activeItems(s) {
    s = s || load();
    var out = [];
    Object.keys(s.items).forEach(function (k) {
      if (!knownIssue(k)) return;
      var t = s.tombstones[k] || 0;
      var it = s.items[k];
      if (t && t >= (it.updatedAt || 0)) return; // deleted after last edit
      out.push(it);
    });
    // Highest priority first, then most recently touched.
    var rank = { high: 0, medium: 1, low: 2 };
    out.sort(function (a, b) {
      var d = (rank[a.priority] || 1) - (rank[b.priority] || 1);
      if (d) return d;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    return out;
  }
  function count(s) { return activeItems(s).length; }

  // ── Alignment Signature projection ──────────────────────────────────────────
  // My Stances feeds the scoring engine through TWO clean, separable channels:
  //
  //   1. DIRECTION → the Alignment level. A position maps to a direction only:
  //      Support → 'support', Oppose → 'oppose', Mixed → 'neutral'. This is what
  //      decides whether a politician who holds the position scores HIGH (you
  //      agree) or LOW (you oppose) for you.
  //   2. PRIORITY → a weight multiplier applied by the scorer (see priorityWeight
  //      + window._msPriorityWeight below). High counts more, Low counts less.
  //
  // Keeping direction out of the priority and priority out of the direction means
  // all three priority levels move the match score distinctly, with no double
  // counting against the engine's own 5-point conviction weights (which still
  // work for anyone tuning the Alignment Tool directly).
  function positionToLevel(position /*, priority */) {
    if (position === 'mixed') return 'neutral';
    if (position === 'oppose') return 'oppose';
    return 'support';
  }
  // How much a My Stances priority scales an issue's weight in the match score.
  // Neutral (1.0) at "medium", heavier at "high", lighter at "low" — so the
  // issues a voter says matter most pull the score hardest, and the ones they
  // flagged only lightly barely nudge it. Purely an importance weight; it never
  // changes the DIRECTION of the match (that's the level above).
  var PRIORITY_WEIGHT = { high: 1.6, medium: 1.0, low: 0.55 };
  function priorityWeight(issueKey) {
    try {
      var s = load();
      var r = s.items[issueKey];
      if (!r) return 1;
      var t = s.tombstones[issueKey] || 0;
      if (t && t >= (r.updatedAt || 0)) return 1; // deleted → no weight
      return PRIORITY_WEIGHT[r.priority] || 1;
    } catch (e) { return 1; }
  }
  // The reverse: read an existing Alignment intensity back into a position+priority
  // so an Alignment Signature built directly in the Alignment Tool shows up here.
  function levelToPosition(level) {
    switch (level) {
      case 'strongly_support': return { position: 'support', priority: 'high' };
      case 'support': return { position: 'support', priority: 'medium' };
      case 'neutral': return { position: 'mixed', priority: 'medium' };
      case 'oppose': return { position: 'oppose', priority: 'medium' };
      case 'strongly_oppose': return { position: 'oppose', priority: 'high' };
    }
    return null;
  }

  // Expose the priority weight so the Alignment scorer can consult it (one-way,
  // optional dependency — the scorer treats a missing hook as weight 1.0).
  try { window._msPriorityWeight = priorityWeight; } catch (e) {}

  function alignHas(issueKey) {
    try { return !!(window._alignIssues && typeof window._alignIssues.has === 'function' && window._alignIssues.has(issueKey)); }
    catch (e) { return false; }
  }
  function alignLevelOf(issueKey) {
    // Membership implies the default 'support' level unless an explicit intensity
    // overlay is stored (this mirrors the Alignment Tool's own contract).
    if (!alignHas(issueKey)) return null;
    try {
      var ov = window._alignIntensity && window._alignIntensity[issueKey];
      return ov || 'support';
    } catch (e) { return 'support'; }
  }

  // Push one stance up into the Alignment Signature (adds the issue + sets its
  // intensity + persists + refreshes every alignment-aware surface). Only fires
  // when the target level actually differs, so we never trigger needless re-renders.
  function projectOne(rec) {
    if (!rec || !knownIssue(rec.issueKey)) return;
    if (typeof window.alignSetIntensity !== 'function') return;
    var desired = positionToLevel(rec.position, rec.priority);
    var current = alignLevelOf(rec.issueKey);
    if (current === desired) return;
    try { window.alignSetIntensity(rec.issueKey, desired); } catch (e) {}
  }
  // Remove an issue from the Alignment Signature when its stance is deleted here.
  function unprojectOne(issueKey) {
    if (!alignHas(issueKey)) return;
    if (typeof window.alignToggleIssue !== 'function') return;
    try { window.alignToggleIssue(issueKey); } catch (e) {}
  }

  // Keep the two stores coherent without churn. Runs on load and after any
  // cross-device pull:
  //   1. Adopt Alignment-only issues as real stances here (no writes back up).
  //   2. Project any stance whose Alignment level drifted (rare on the device that
  //      authored both; only bites genuinely-new cross-device items).
  function reconcileWithAlignment() {
    var s = load();
    var changed = false;
    // 1) adopt
    try {
      if (window._alignIssues && typeof window._alignIssues.forEach === 'function') {
        window._alignIssues.forEach(function (k) {
          if (!knownIssue(k)) return;
          var t = s.tombstones[k] || 0;
          var existing = s.items[k];
          var live = existing && !(t && t >= (existing.updatedAt || 0));
          if (live) return; // already a stance here
          var lvl = alignLevelOf(k);
          var pp = levelToPosition(lvl);
          if (!pp) return;
          var ts = now();
          s.items[k] = { issueKey: k, position: pp.position, priority: pp.priority, note: (existing && existing.note) || '', createdAt: (existing && existing.createdAt) || ts, updatedAt: ts };
          if (s.tombstones[k]) delete s.tombstones[k];
          changed = true;
        });
      }
    } catch (e) {}
    if (changed) { s.updatedAt = now(); save(s, false); }
    // 2) project drift (does not write our own store, only the alignment store)
    activeItems(s).forEach(function (rec) { projectOne(rec); });
  }

  // ── Mutations ───────────────────────────────────────────────────────────────
  function setStance(issueKey, position, priority, note) {
    if (!knownIssue(issueKey)) return null;
    if (position !== 'support' && position !== 'oppose' && position !== 'mixed') return null;
    var s = load();
    var prev = s.items[issueKey];
    var isNew = !prev || (s.tombstones[issueKey] && s.tombstones[issueKey] >= (prev.updatedAt || 0));
    var ts = now();
    var rec = {
      issueKey: issueKey,
      position: position,
      priority: (priority === 'high' || priority === 'medium' || priority === 'low') ? priority : (prev && prev.priority) || 'medium',
      note: typeof note === 'string' ? note.slice(0, 2000) : (prev ? prev.note : ''),
      createdAt: (prev && !isNew && prev.createdAt) ? prev.createdAt : ts,
      updatedAt: ts
    };
    s.items[issueKey] = rec;
    if (s.tombstones[issueKey]) delete s.tombstones[issueKey];
    s.updatedAt = ts;
    save(s, true);
    projectOne(rec);
    if (isNew) recordImpact(issueKey);
    if (s.settings.public) pushPublicSnapshot(s); // keep a live public showcase fresh
    return rec;
  }

  function setNote(issueKey, note) {
    var s = load();
    var rec = s.items[issueKey];
    if (!rec) return;
    rec.note = typeof note === 'string' ? note.slice(0, 2000) : '';
    rec.updatedAt = now();
    s.updatedAt = rec.updatedAt;
    save(s, true);
    // Notes never leave the device except locally + private account sync; they are
    // intentionally excluded from the public snapshot, so no public push here.
  }

  function removeStance(issueKey) {
    var s = load();
    if (!s.items[issueKey] && !s.tombstones[issueKey]) return;
    var ts = now();
    delete s.items[issueKey];
    s.tombstones[issueKey] = ts;
    s.updatedAt = ts;
    save(s, true);
    unprojectOne(issueKey);
    if (s.settings.public) pushPublicSnapshot(s);
  }

  function setPublic(on) {
    var s = load();
    s.settings.public = !!on;
    s.settings.publicUpdatedAt = now();
    s.updatedAt = s.settings.publicUpdatedAt;
    save(s, true);
    if (on) pushPublicSnapshot(s); else clearPublicSnapshot();
  }

  // ── Personal Impact Tracker bridge ──────────────────────────────────────────
  function recordImpact(issueKey) {
    try { if (window.PDXImpact && typeof window.PDXImpact.record === 'function') window.PDXImpact.record('issues', issueKey); } catch (e) {}
  }

  // ── Firebase account: optional public showcase snapshot ─────────────────────
  // Reuses the same users/{uid} doc the app already writes (team, location,
  // Alignment Signature). Notes are deliberately omitted — a public showcase is a
  // direction/priority summary only.
  function fbUser() {
    try {
      var a = (typeof auth !== 'undefined' && auth) ? auth : (window.firebase && window.firebase.auth ? window.firebase.auth() : null);
      var u = a && a.currentUser;
      return (u && !u.isAnonymous) ? u : null;
    } catch (e) { return null; }
  }
  function fbDb() {
    try {
      if (typeof db !== 'undefined' && db && typeof db.collection === 'function') return db;
      if (typeof firestore !== 'undefined' && firestore && typeof firestore.collection === 'function') return firestore;
      if (window.firebase && typeof window.firebase.firestore === 'function') return window.firebase.firestore();
    } catch (e) {}
    return null;
  }
  function publicPayload(s) {
    return activeItems(s).map(function (r) {
      var d = issueMap()[r.issueKey] || {};
      return { issue: r.issueKey, label: (d.label || r.issueKey), position: r.position, priority: r.priority };
    });
  }
  function pushPublicSnapshot(s) {
    var u = fbUser(), d = fbDb();
    if (!u || !d) return; // logged-out / offline → stays local-only, no-op
    var payload = {};
    payload[FS_PUBLIC_FLAG] = true;
    payload[FS_PUBLIC_DATA] = publicPayload(s);
    payload[FS_PUBLIC_AT] = now();
    try { d.collection('users').doc(u.uid).set(payload, { merge: true }); } catch (e) {}
  }
  function clearPublicSnapshot() {
    var u = fbUser(), d = fbDb();
    if (!u || !d) return;
    var payload = {};
    payload[FS_PUBLIC_FLAG] = false;
    payload[FS_PUBLIC_DATA] = [];
    payload[FS_PUBLIC_AT] = now();
    try { d.collection('users').doc(u.uid).set(payload, { merge: true }); } catch (e) {}
  }

  // ── PDXStore collection registration (runs at parse time) ────────────────────
  // Registered synchronously so the snapshot provider + reconciler exist before
  // the account-sync startup pull/push (which fires ~2.5s after sign-in).
  (function registerCollection() {
    var st = store();
    if (!st) return;
    try { if (typeof st.defineCollection === 'function') st.defineCollection(COLLECTION, { keys: [KEY], label: 'Your saved stances on the issues' }); } catch (e) {}
    try { if (typeof st.registerSnapshot === 'function') st.registerSnapshot(COLLECTION, function () { return load(); }); } catch (e) {}
    try {
      if (typeof st.registerReconciler === 'function') {
        st.registerReconciler(COLLECTION, function (serverSnap, meta) {
          if (!serverSnap || typeof serverSnap !== 'object') return { changed: false };
          var local = load();
          var server = normalize(serverSnap);
          var merged = blank();
          // Union tombstones (max delete time wins).
          var tk;
          for (tk in local.tombstones) merged.tombstones[tk] = local.tombstones[tk];
          for (tk in server.tombstones) merged.tombstones[tk] = Math.max(merged.tombstones[tk] || 0, server.tombstones[tk]);
          // Union item keys; per key, the newer edit wins.
          var keys = {};
          Object.keys(local.items).forEach(function (k) { keys[k] = 1; });
          Object.keys(server.items).forEach(function (k) { keys[k] = 1; });
          Object.keys(keys).forEach(function (k) {
            var a = local.items[k], b = server.items[k];
            var winner = (!a) ? b : (!b) ? a : ((b.updatedAt || 0) > (a.updatedAt || 0) ? b : a);
            if (!winner) return;
            var t = merged.tombstones[k] || 0;
            if (t && t >= (winner.updatedAt || 0)) return; // deleted after this edit
            merged.items[k] = winner;
          });
          // Settings (public flag): newer publicUpdatedAt wins.
          merged.settings = (server.settings.publicUpdatedAt > local.settings.publicUpdatedAt) ? server.settings : local.settings;
          merged.updatedAt = Math.max(local.updatedAt || 0, server.updatedAt || 0);
          // Keep dirty if we had un-pushed local edits so the union pushes back up.
          save(merged, !!(meta && meta.dirty));
          // Re-render + re-project after a pull brings changes down.
          try { window.dispatchEvent(new CustomEvent('pdx-stances-change', { detail: { source: 'pull' } })); } catch (e) {}
          return { changed: true };
        });
      }
    } catch (e) {}
  })();

  // ══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ══════════════════════════════════════════════════════════════════════════
  var _inited = false;
  var _noteTimers = {};
  var uiState = { query: '', filter: '', open: {} }; // filter = core-issue key or ''

  function isSignedIn() { return !!fbUser(); }

  function render() {
    var mount = el(MOUNT);
    if (!mount) return;
    var s = load();
    var items = activeItems(s);
    var byKey = {};
    items.forEach(function (r) { byKey[r.issueKey] = r; });

    var html = '<div class="ms-wrap">';
    html += renderAccount(s, items);
    html += renderSummary(s, items);
    html += renderPowers(items);
    html += renderShowcase(s, items);
    html += renderBrowse(s, byKey);
    html += '</div>';
    mount.innerHTML = html;
  }

  function renderAccount(s) {
    if (isSignedIn()) {
      return '<div class="ms-acct is-in"><span class="ms-acct-ic">🔒</span>' +
        '<span>Your stances are <strong>private</strong> and saved to your account — synced across your devices.</span></div>';
    }
    return '<div class="ms-acct"><span class="ms-acct-ic">💾</span>' +
      '<span>Saved <strong>on this device</strong>. <button type="button" class="ms-link" data-ms-signin="1">Sign in</button> to keep your stances synced across devices.</span></div>';
  }

  function renderSummary(s, items) {
    var n = items.length;
    if (!n) {
      return '<div class="ms-summary is-empty">' +
        '<div class="ms-sum-emptytitle">You haven’t taken any positions yet</div>' +
        '<div class="ms-sum-emptybody">Pick an issue below and choose <strong>Support</strong>, <strong>Oppose</strong> or <strong>Mixed</strong>. As you do, PolitiDex starts scoring every politician by how well they match <em>you</em>.</div>' +
        '</div>';
    }
    var chips = items.map(function (r) {
      var d = issueMap()[r.issueKey] || {};
      var pos = POSITIONS.filter(function (p) { return p.key === r.position; })[0] || POSITIONS[0];
      var prioIc = r.priority === 'high' ? '⭐' : '';
      return '<button type="button" class="ms-chip ' + pos.cls + '" data-ms-goto="' + esc(r.issueKey) + '" title="Edit your position">' +
        '<span class="ms-chip-pos">' + pos.icon + '</span>' +
        '<span class="ms-chip-lbl">' + esc(d.label || r.issueKey) + '</span>' +
        (prioIc ? '<span class="ms-chip-prio">' + prioIc + '</span>' : '') +
        '</button>';
    }).join('');
    return '<div class="ms-summary">' +
      '<div class="ms-sum-head"><h3>Your stances <span class="ms-sum-count">' + n + '</span></h3>' +
      '<button type="button" class="ms-link ms-sum-clear" data-ms-clearall="1">Clear all</button></div>' +
      '<div class="ms-chips">' + chips + '</div>' +
      '</div>';
  }

  function renderPowers(items) {
    var n = items.length;
    var live = n > 0;
    var actions = '';
    if (live) {
      actions =
        '<button type="button" class="ms-pow-btn" data-ms-act="team">⚖️ Compare my team by match</button>' +
        '<button type="button" class="ms-pow-btn" data-ms-act="align">🎯 Open the Alignment Tool</button>' +
        '<button type="button" class="ms-pow-btn" data-ms-act="library">📚 See where politicians stand</button>';
    }
    return '<div class="ms-powers' + (live ? ' is-live' : '') + '">' +
      '<div class="ms-pow-title">What your stances power</div>' +
      '<p class="ms-pow-body">' + (live
        ? 'PolitiDex is now scoring every profile, card and your voting team against <strong>' + n + '</strong> position' + (n > 1 ? 's' : '') + '. A match % that reflects <em>your</em> positions — not a party label — shows up wherever a politician appears. <strong>High-priority</strong> positions count more toward that score; <strong>Low</strong> count less.'
        : 'Once you take a position, PolitiDex scores every politician against it — turning your values into an accountability yardstick you can point at anyone’s record.') +
      '</p>' +
      (actions ? '<div class="ms-pow-actions">' + actions + '</div>' : '') +
      '</div>';
  }

  function renderShowcase(s, items) {
    var on = !!s.settings.public;
    var n = items.length;
    var toggleRow =
      '<div class="ms-show-row">' +
      '<div class="ms-show-main">' +
      '<div class="ms-show-title">' + (on ? '🌐 Showcasing publicly' : '🔒 Private') + '</div>' +
      '<div class="ms-show-desc">' + (on
        ? 'Your <strong>My Views</strong> card below is what others see. Only the issue and your Support / Oppose / Mixed direction are shared — <strong>your notes are never included</strong>.'
        : 'Your stances are private to you. Turn on <strong>Showcase publicly</strong> to build a shareable <strong>My Views</strong> card (your notes always stay private).') + '</div>' +
      (on && !isSignedIn() ? '<div class="ms-show-note">You’re not signed in, so this link works from bundled data on this device. Sign in to attach it to your account.</div>' : '') +
      '</div>' +
      '<label class="ms-toggle" title="Showcase your stances publicly">' +
      '<input type="checkbox" data-ms-public="1"' + (on ? ' checked' : '') + (n ? '' : ' disabled') + ' />' +
      '<span class="ms-toggle-track"><span class="ms-toggle-thumb"></span></span>' +
      '</label>' +
      '</div>';

    var preview = '';
    if (on && n) {
      preview = '<div class="ms-views-preview" data-ms-viewscard="1">' +
        renderViewsCard(items, { name: displayName(), owner: true }) +
        '<div class="ms-views-actions">' +
        '<button type="button" class="ms-pow-btn ms-copy" data-ms-copylink="1">🔗 Copy share link</button>' +
        '<span class="ms-views-hint">Anyone with the link sees this card — never your notes.</span>' +
        '</div>' +
        '</div>';
    }

    return '<div class="ms-showcase' + (on ? ' is-on' : '') + '">' + toggleRow + preview + '</div>';
  }

  // Shared, read-only renderer for a set of public stances. Used both for the
  // owner's own preview (owner:true) and for a visitor viewing a shared link. It
  // renders ONLY issue label + direction + a High-priority star — never notes.
  function renderViewsCard(list, opts) {
    opts = opts || {};
    var groups = { support: [], oppose: [], mixed: [] };
    (list || []).forEach(function (r) { if (groups[r.position]) groups[r.position].push(r); });
    var body = POSITIONS.map(function (p) {
      var arr = groups[p.key];
      if (!arr || !arr.length) return '';
      var chips = arr.map(function (r) {
        var d = issueMap()[r.issueKey] || {};
        var star = r.priority === 'high' ? '<span class="mv-star" title="High priority for them">⭐</span>' : '';
        return '<span class="mv-chip">' + esc(d.label || r.issueKey) + star + '</span>';
      }).join('');
      return '<div class="mv-group ' + p.cls + '">' +
        '<div class="mv-group-head"><span class="mv-group-ic">' + p.icon + '</span>' + p.label +
        '<span class="mv-group-n">' + arr.length + '</span></div>' +
        '<div class="mv-chips">' + chips + '</div></div>';
    }).join('');
    if (!body) body = '<div class="mv-empty">No public positions yet.</div>';
    var who = opts.owner ? 'My Views' : esc(opts.name || 'A PolitiDex member') + '’s Views';
    var sub = opts.owner
      ? 'How your public card looks to everyone else'
      : 'Public positions on PolitiDex · notes kept private';
    return '<div class="mv-card">' +
      '<div class="mv-head"><div class="mv-title">🎯 ' + who + '</div>' +
      '<div class="mv-sub">' + sub + '</div></div>' +
      '<div class="mv-groups">' + body + '</div>' +
      '</div>';
  }

  // ── Visitor overlay: someone opened a ?views= share link ────────────────────
  function checkSharedViewsInUrl() {
    var tok = null;
    try { tok = new URLSearchParams(location.search).get(SHARE_PARAM); } catch (e) { tok = null; }
    if (!tok) return;
    // Strip the param immediately so a refresh doesn't re-open and it isn't
    // carried into onward navigation (mirrors the ?team= share flow).
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    var decoded = decodeViews(tok);
    if (!decoded || !decoded.items.length) return;
    // Defer until the issue vocabulary is present so labels resolve.
    if (!Object.keys(issueMap()).length) { setTimeout(function () { showViewsOverlay(decoded); }, 400); return; }
    showViewsOverlay(decoded);
  }

  function showViewsOverlay(decoded) {
    if (!decoded) return;
    var host = document.createElement('div');
    host.className = 'ms-ov';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', esc(decoded.name) + ' — public views');
    host.innerHTML =
      '<div class="ms-ov-backdrop" data-ms-ovclose="1"></div>' +
      '<div class="ms-ov-panel">' +
      '<button type="button" class="ms-ov-x" data-ms-ovclose="1" aria-label="Close">✕</button>' +
      renderViewsCard(decoded.items, { name: decoded.name, owner: false }) +
      '<div class="ms-ov-cta">' +
      '<div class="ms-ov-cta-txt">Where do <em>you</em> stand? Build your own record and see which politicians actually match you.</div>' +
      '<button type="button" class="ms-ov-cta-btn" data-ms-ovbuild="1">🎯 Build my stances</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(host);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { host.classList.add('is-open'); });
    function close() {
      host.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { if (host.parentNode) host.parentNode.removeChild(host); }, 220);
    }
    host.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('[data-ms-ovclose]')) { close(); return; }
      if (t.closest && t.closest('[data-ms-ovbuild]')) { close(); if (window.PDXStances && PDXStances.open) PDXStances.open(); }
    });
    document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); } });
  }

  function renderBrowse(s, byKey) {
    var q = (uiState.query || '').trim().toLowerCase();
    var filter = uiState.filter || '';
    var cores = coreIssues();

    // Filter chips (the 12 core national issues + All).
    var filterChips = '<button type="button" class="ms-fchip' + (filter === '' ? ' is-on' : '') + '" data-ms-filter="">All issues</button>';
    cores.forEach(function (ci) {
      filterChips += '<button type="button" class="ms-fchip' + (filter === ci.key ? ' is-on' : '') + '" data-ms-filter="' + esc(ci.key) + '">' + esc(ci.label) + '</button>';
    });

    var groupsHtml = '';
    var anyShown = false;
    cores.forEach(function (ci) {
      if (filter && filter !== ci.key) return;
      var rows = '';
      var shownInGroup = 0, activeInGroup = 0;
      ci.keys.forEach(function (k) {
        if (!knownIssue(k)) return;
        var d = issueMap()[k];
        if (q) {
          var hay = ((d.label || '') + ' ' + (d.chip || '') + ' ' + (d.keywords || []).join(' ')).toLowerCase();
          if (hay.indexOf(q) === -1) return;
        }
        shownInGroup++;
        if (byKey[k]) activeInGroup++;
        rows += renderIssueRow(k, d, byKey[k]);
      });
      if (!shownInGroup) return;
      anyShown = true;
      // Open a group when it's the active filter, when searching, when it holds a
      // stance, or when the user expanded it.
      var open = !!filter || !!q || activeInGroup > 0 || !!uiState.open[ci.key];
      groupsHtml += '<div class="ms-group' + (open ? ' is-open' : '') + '" data-ms-group="' + esc(ci.key) + '">' +
        '<button type="button" class="ms-group-head" data-ms-toggle="' + esc(ci.key) + '">' +
        '<span class="ms-group-lbl">' + esc(ci.label) + '</span>' +
        (activeInGroup ? '<span class="ms-group-badge">' + activeInGroup + '</span>' : '') +
        '<span class="ms-group-caret">▾</span>' +
        '</button>' +
        '<div class="ms-group-body">' + rows + '</div>' +
        '</div>';
    });
    if (!anyShown) groupsHtml = '<div class="ms-noresult">No issues match “' + esc(uiState.query) + '”.</div>';

    return '<div class="ms-browse">' +
      '<div class="ms-browse-head">' +
      '<h3 class="ms-browse-title">Browse issues &amp; set your position</h3>' +
      '<div class="ms-search"><span class="ms-search-ic">🔎</span>' +
      '<input type="search" class="ms-search-in" placeholder="Search issues…" value="' + esc(uiState.query) + '" data-ms-search="1" aria-label="Search issues" /></div>' +
      '</div>' +
      '<div class="ms-filters">' + filterChips + '</div>' +
      '<div class="ms-groups">' + groupsHtml + '</div>' +
      '</div>';
  }

  function renderIssueRow(k, d, rec) {
    var active = !!rec;
    var posBtns = POSITIONS.map(function (p) {
      var on = active && rec.position === p.key;
      return '<button type="button" class="ms-pos ' + p.cls + (on ? ' is-on' : '') + '" data-ms-set="' + p.key + '" data-issue="' + esc(k) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="ms-pos-ic">' + p.icon + '</span>' + p.label + '</button>';
    }).join('');

    var controls = '';
    if (active) {
      var prioOpts = PRIORITIES.map(function (p) {
        return '<option value="' + p.key + '"' + (rec.priority === p.key ? ' selected' : '') + '>' + p.short + '</option>';
      }).join('');
      var hasNote = rec.note && rec.note.length;
      controls = '<div class="ms-row-controls">' +
        '<label class="ms-prio"><span>Priority</span><select data-ms-prio="1" data-issue="' + esc(k) + '" aria-label="Priority">' + prioOpts + '</select></label>' +
        '<button type="button" class="ms-notebtn' + (hasNote ? ' has-note' : '') + '" data-ms-notetoggle="' + esc(k) + '">' + (hasNote ? '📝 Note' : '＋ Add note') + '</button>' +
        '<button type="button" class="ms-remove" data-ms-remove="' + esc(k) + '" title="Remove this stance">✕</button>' +
        '</div>' +
        '<div class="ms-note-wrap' + (hasNote ? ' is-open' : '') + '" data-ms-notewrap="' + esc(k) + '">' +
        '<textarea class="ms-note" data-ms-note="' + esc(k) + '" maxlength="2000" placeholder="Why this matters to you (private)…" aria-label="Private note">' + esc(rec.note) + '</textarea>' +
        '<span class="ms-note-hint">🔒 Private — never shared, even when your stances are public.</span>' +
        '</div>';
    }

    return '<div class="ms-issue' + (active ? ' is-active ' + posClass(rec.position) : '') + '" data-ms-row="' + esc(k) + '">' +
      '<div class="ms-issue-main">' +
      '<div class="ms-issue-text"><div class="ms-issue-lbl">' + esc(d.label || k) + '</div>' +
      (d.chip ? '<div class="ms-issue-chip">' + esc(d.chip) + '</div>' : '') + '</div>' +
      '<div class="ms-pos-group" role="group" aria-label="Your position on ' + esc(d.label || k) + '">' + posBtns + '</div>' +
      '</div>' +
      controls +
      '</div>';
  }
  function posClass(position) {
    return position === 'support' ? 'is-support' : position === 'oppose' ? 'is-oppose' : 'is-mixed';
  }

  // ── Event delegation ────────────────────────────────────────────────────────
  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var b;

    if ((b = t.closest('[data-ms-set]'))) {
      var pos = b.getAttribute('data-ms-set');
      var key = b.getAttribute('data-issue');
      var cur = load().items[key];
      // Clicking the position you already hold clears it (a natural toggle-off).
      if (cur && cur.position === pos && !(load().tombstones[key] >= (cur.updatedAt || 0))) removeStance(key);
      else setStance(key, pos, cur ? cur.priority : 'medium', cur ? cur.note : '');
      afterMutate();
      return;
    }
    if ((b = t.closest('[data-ms-remove]'))) { removeStance(b.getAttribute('data-ms-remove')); afterMutate(); return; }
    if ((b = t.closest('[data-ms-notetoggle]'))) {
      var wrap = el(MOUNT).querySelector('[data-ms-notewrap="' + cssEsc(b.getAttribute('data-ms-notetoggle')) + '"]');
      if (wrap) { wrap.classList.toggle('is-open'); var ta = wrap.querySelector('textarea'); if (ta && wrap.classList.contains('is-open')) ta.focus(); }
      return;
    }
    if ((b = t.closest('[data-ms-toggle]'))) {
      var gk = b.getAttribute('data-ms-toggle');
      var grp = b.closest('.ms-group');
      if (grp) { var isOpen = grp.classList.toggle('is-open'); uiState.open[gk] = isOpen; }
      return;
    }
    if ((b = t.closest('[data-ms-filter]'))) { uiState.filter = b.getAttribute('data-ms-filter') || ''; render(); return; }
    if ((b = t.closest('[data-ms-goto]'))) { gotoIssue(b.getAttribute('data-ms-goto')); return; }
    if ((b = t.closest('[data-ms-clearall]'))) { clearAll(); return; }
    if ((b = t.closest('[data-ms-copylink]'))) { copyShareLink(); return; }
    if ((b = t.closest('[data-ms-signin]'))) { openSignIn(); return; }
    if ((b = t.closest('[data-ms-act]'))) { powerAction(b.getAttribute('data-ms-act')); return; }
  }

  function onChange(e) {
    var t = e.target;
    if (!t) return;
    if (t.matches && t.matches('[data-ms-prio]')) {
      var key = t.getAttribute('data-issue');
      var cur = load().items[key];
      if (cur) { setStance(key, cur.position, t.value, cur.note); afterMutate(); }
      return;
    }
    if (t.matches && t.matches('[data-ms-public]')) { setPublic(t.checked); render(); return; }
  }

  function onInput(e) {
    var t = e.target;
    if (!t) return;
    if (t.matches && t.matches('[data-ms-search]')) {
      uiState.query = t.value || '';
      // Re-render but keep focus + caret in the search box.
      render();
      var box = el(MOUNT) && el(MOUNT).querySelector('[data-ms-search]');
      if (box) { box.focus(); try { var v = box.value.length; box.setSelectionRange(v, v); } catch (e2) {} }
      return;
    }
    if (t.matches && t.matches('[data-ms-note]')) {
      var key = t.getAttribute('data-ms-note');
      var val = t.value;
      clearTimeout(_noteTimers[key]);
      _noteTimers[key] = setTimeout(function () { setNote(key, val); }, 500);
      return;
    }
  }

  function cssEsc(s) { try { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/"/g, '\\"'); } catch (e) { return s; } }

  function afterMutate() {
    render();
    try { window.dispatchEvent(new CustomEvent('pdx-stances-change', { detail: { source: 'edit' } })); } catch (e) {}
  }

  function clearAll() {
    var items = activeItems();
    if (!items.length) return;
    if (!window.confirm('Remove all ' + items.length + ' of your saved stances? This can’t be undone.')) return;
    items.forEach(function (r) { removeStance(r.issueKey); });
    afterMutate();
  }

  function gotoIssue(k) {
    var d = issueMap()[k];
    var ci = (typeof window.coreIssueForKey === 'function') ? window.coreIssueForKey(k) : null;
    if (ci) { uiState.filter = ''; uiState.open[ci.key] = true; }
    uiState.query = '';
    render();
    var row = el(MOUNT) && el(MOUNT).querySelector('[data-ms-row="' + cssEsc(k) + '"]');
    if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('ms-flash'); setTimeout(function () { row.classList.remove('ms-flash'); }, 1200); }
  }

  function powerAction(act) {
    if (act === 'team') {
      if (typeof window.myteamCompareAll === 'function') { try { window.myteamCompareAll(); return; } catch (e) {} }
      scrollTo('my-politicians');
    } else if (act === 'align') {
      if (typeof window.alignTogglePanel === 'function') { try { window.alignTogglePanel(true); return; } catch (e) {} }
    } else if (act === 'library') {
      if (window.PDXStanceLibrary && typeof window.PDXStanceLibrary.open === 'function') { try { window.PDXStanceLibrary.open(); return; } catch (e) {} }
      scrollTo('stance-library');
    }
  }
  function scrollTo(id) { var n = el(id); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  function openSignIn() {
    // Reuse whatever sign-in entry point the app exposes; fall back to the nav.
    var fns = ['openAuthModal', 'openSignInModal', 'showLogin', 'pdxOpenAuth'];
    for (var i = 0; i < fns.length; i++) { if (typeof window[fns[i]] === 'function') { try { window[fns[i]](); return; } catch (e) {} } }
    var btn = document.querySelector('#nav-auth-desktop button, #nav-auth-mobile button, [data-auth-signin]');
    if (btn) btn.click();
  }

  // ── Boot / lazy mount ─────────────────────────────────────────────────────
  function init() {
    if (_inited) return;
    var mount = el(MOUNT);
    if (!mount) return;
    _inited = true;
    render();
    mount.addEventListener('click', onClick);
    mount.addEventListener('change', onChange);
    mount.addEventListener('input', onInput);
  }

  function setup() {
    // A visitor may have arrived on a ?views= share link — show the read-only
    // "My Views" overlay regardless of whether the section itself is mounted.
    try { checkSharedViewsInUrl(); } catch (e) {}

    // Data-layer coherence runs regardless of whether the section is ever viewed,
    // so cross-device stances light up match % everywhere immediately.
    try { reconcileWithAlignment(); } catch (e) {}

    // Re-render on our own change events and when auth flips (sign-in/out changes
    // the account banner and enables the public push path).
    window.addEventListener('pdx-stances-change', function (ev) {
      if (ev && ev.detail && ev.detail.source === 'pull') { try { reconcileWithAlignment(); } catch (e) {} }
      if (_inited) render();
    });
    try {
      var a = (typeof auth !== 'undefined' && auth) ? auth : (window.firebase && window.firebase.auth ? window.firebase.auth() : null);
      if (a && typeof a.onAuthStateChanged === 'function') a.onAuthStateChanged(function () { if (_inited) render(); });
    } catch (e) {}

    var host = el('my-stances');
    if (!host) return;
    // Deep-link straight to the section → mount now.
    if (location.hash === '#my-stances') { init(); return; }
    // Otherwise mount lazily when it scrolls into view (keeps first paint light).
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { init(); io.disconnect(); } });
      }, { rootMargin: '400px 0px' });
      io.observe(host);
    } else {
      init();
    }
    // Also honor a later hash change to the section.
    window.addEventListener('hashchange', function () { if (location.hash === '#my-stances') init(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();

  // ══════════════════════════════════════════════════════════════════════════
  // "YOUR STANCE vs THEIR RECORD" — a neutral, reusable comparison view
  // ══════════════════════════════════════════════════════════════════════════
  // Resolve the voter's OWN direction + priority for an issue: the explicit My
  // Stances record wins; otherwise fall back to a position they set directly in
  // the Alignment Tool (direction read from its intensity level). Returns null
  // when the voter has taken no position on this issue at all.
  function userDirectionFor(issueKey) {
    if (!issueKey) return null;
    var s = load();
    var r = s.items[issueKey];
    var t = s.tombstones[issueKey] || 0;
    if (r && !(t && t >= (r.updatedAt || 0))) return { position: r.position, priority: r.priority, source: 'stance' };
    var lvl = alignLevelOf(issueKey);
    if (lvl) { var pp = levelToPosition(lvl); if (pp) { pp.source = 'align'; return pp; } }
    return null;
  }

  function posPill(position, cls) {
    var p = null;
    for (var i = 0; i < POSITIONS.length; i++) { if (POSITIONS[i].key === position) { p = POSITIONS[i]; break; } }
    if (!p) return '<span class="msvs-pill msvs-none">No clear position</span>';
    return '<span class="msvs-pill ' + p.cls + (cls ? ' ' + cls : '') + '">' + p.icon + ' ' + p.label + '</span>';
  }

  // Compact "You: 👍 Support ⭐" chip — used by the comparison table's label cell.
  function myStanceChipHtml(issueKey) {
    var dir = userDirectionFor(issueKey);
    if (!dir) return '';
    var p = null;
    for (var i = 0; i < POSITIONS.length; i++) { if (POSITIONS[i].key === dir.position) { p = POSITIONS[i]; break; } }
    if (!p) return '';
    var star = dir.priority === 'high' ? ' <span class="ms-you-star" title="High priority for you">⭐</span>' : '';
    return '<span class="ms-you-chip ' + p.cls + '"><span class="ms-you-lbl">You</span>' + p.icon + ' ' + p.label + star + '</span>';
  }

  // Full "Your Stance vs Their Record" block for a politician, built from the
  // Alignment breakdown (kept in lock-step with the match %). Lists only issues
  // where the politician has a DOCUMENTED position (an honest "record"), each with
  // your direction, their direction, and an Agree / Partial / Differ verdict. It
  // reports the record neutrally — it never editorializes either side.
  var VS_VERDICT = {
    match: { cls: 'is-agree', ico: '✓', lbl: 'Agree' },
    partial: { cls: 'is-partial', ico: '~', lbl: 'Partial' },
    mismatch: { cls: 'is-differ', ico: '✗', lbl: 'Differ' }
  };
  function vsRecordHtml(pid, opts) {
    opts = opts || {};
    if (!pid || typeof window._calcAlignmentBreakdown !== 'function') return '';
    var bd;
    try { bd = window._calcAlignmentBreakdown(pid); } catch (e) { return ''; }
    if (!bd || !bd.issues || !bd.issues.length) return '';
    var rows = bd.issues.filter(function (i) { return i.direct && i.stance; });
    if (!rows.length) return '';
    rows = rows.slice(0, opts.max || 8);
    var body = rows.map(function (i) {
      var dir = userDirectionFor(i.key);
      var youPos = dir ? dir.position
        : (i.intensity === 'oppose' || i.intensity === 'strongly_oppose') ? 'oppose'
        : (i.intensity === 'neutral') ? 'mixed' : 'support';
      var youPrio = dir ? dir.priority : ((i.intensity === 'strongly_support' || i.intensity === 'strongly_oppose') ? 'high' : 'medium');
      var vm = VS_VERDICT[i.verdict] || { cls: 'is-solo', ico: '•', lbl: 'On record' };
      var star = youPrio === 'high' ? '<span class="msvs-star" title="High priority for you">⭐</span>' : '';
      return '<div class="msvs-row">' +
        '<div class="msvs-issue">' + esc(i.label) + (i.topic ? '<span class="msvs-topic">' + esc(i.topic) + '</span>' : '') + '</div>' +
        '<div class="msvs-cells">' +
        '<span class="msvs-side"><span class="msvs-side-lbl">You</span>' + posPill(youPos) + star + '</span>' +
        '<span class="msvs-vs">vs</span>' +
        '<span class="msvs-side"><span class="msvs-side-lbl">Them</span>' + posPill(i.stance) + '</span>' +
        '<span class="msvs-verdict ' + vm.cls + '">' + vm.ico + ' ' + vm.lbl + '</span>' +
        '</div>' +
        '</div>';
    }).join('');
    return '<div class="msvs">' +
      (opts.heading === false ? '' : '<div class="msvs-head">🤝 Your Stance <span>vs</span> Their Record</div>') +
      '<div class="msvs-list">' + body + '</div>' +
      (opts.foot === false ? '' : '<div class="msvs-foot">Your saved position lined up against their documented record. <button type="button" class="ms-link" onclick="if(window.PDXStances&&PDXStances.open)PDXStances.open();else location.hash=\'#my-stances\';">Manage in My Stances</button></div>') +
      '</div>';
  }

  // ── Public API ───────────────────────────────────────────────────────────
  window.PDXStances = {
    KEY: KEY,
    COLLECTION: COLLECTION,
    // reads
    all: function () { return activeItems(); },
    get: function (issueKey) { var s = load(); var r = s.items[issueKey]; return (r && !(s.tombstones[issueKey] >= (r.updatedAt || 0))) ? r : null; },
    count: function () { return count(); },
    isPublic: function () { return !!load().settings.public; },
    // mutations
    set: function (issueKey, position, priority, note) { var r = setStance(issueKey, position, priority, note); afterMutate(); return r; },
    remove: function (issueKey) { removeStance(issueKey); afterMutate(); },
    setPublic: function (on) { setPublic(on); if (_inited) render(); },
    // public showcase / My Views
    shareUrl: function () { return shareUrl(load()); },
    copyShareLink: copyShareLink,
    showViews: function (token) { var d = token ? decodeViews(token) : { name: displayName(), items: activeItems() }; showViewsOverlay(d); },
    // integration
    positionToLevel: positionToLevel,
    priorityWeight: priorityWeight,
    myDirection: userDirectionFor,
    myStanceChip: myStanceChipHtml,
    vsRecordHtml: vsRecordHtml,
    syncToAlignment: reconcileWithAlignment,
    // navigation / render
    open: function (issueKey) { init(); scrollTo('my-stances'); if (issueKey) setTimeout(function () { gotoIssue(issueKey); }, 60); },
    // Jump to the section and highlight the My Views showcase card (account menu).
    openViews: function () {
      init(); scrollTo('my-stances');
      setTimeout(function () {
        var card = el(MOUNT) && el(MOUNT).querySelector('[data-ms-viewscard]');
        var target = card || (el(MOUNT) && el(MOUNT).querySelector('.ms-showcase'));
        if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.classList.add('ms-flash'); setTimeout(function () { target.classList.remove('ms-flash'); }, 1200); }
      }, 80);
    },
    render: function () { if (_inited) render(); }
  };
})();
