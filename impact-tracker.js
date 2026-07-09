/* ============================================================================
   Personal Impact Tracker — your own civic footprint, private by default.

   WHAT THIS IS
   ------------
   A lightweight, OPT-IN widget that shows a signed-in (or local) user a private
   tally of their own actions in PolitiDex — candidates researched, reps
   contacted, reforms supported, contributions shared, ballot picks saved. It is
   encouragement, not a scoreboard: it counts the user's OWN activity and pushes
   no agenda, ranks nothing, and is visible only to them.

   PRIVACY & CONSENT (the two rules that shape everything below)
   ------------------------------------------------------------
   1. OPT-IN: nothing is ever recorded until the user turns the tracker on. Every
      record() call is a no-op while disabled, so a user who never opts in leaves
      no footprint at all.
   2. PRIVATE + EASY TO CLEAR: the data lives in the user's own storage and, when
      signed in, syncs across THEIR devices through the exact same PDXStore /
      /api/pdx-sync path the app already uses for saved evidence and their team
      (one row per user, keyed by the verified Firebase uid — never shared). A one
      tap "Clear" zeroes it; "Turn off" stops tracking.

   HOW IT PLUGS IN
   ---------------
   • Storage + sync: a single JSON blob under the localStorage key `pdx_impact_v1`,
     owned by a new PDXStore collection 'impact'. Writes route through PDXStore so
     the collection dirty-tracks and auto-pushes; a registered snapshot/reconciler
     gives it two-way, tombstone-free merge with the same guarantees as 'saved'.
   • Recording: window.PDXImpact.record(metric, id?) is called from a few
     confirmed success points in the app (see index.html: openModal → 'researched',
     mandate support → 'reforms', community/forum submit → 'shared'). This file
     also self-wires two signals that need no app edits: mailto:/tel: clicks
     ('contacted') and committed ballot picks ('picks', via pdx-team-change).
   • Display: a self-contained card mounted as a SIBLING right after the
     #your-ballot section, so Your Ballot's own innerHTML re-renders never wipe it.
   ========================================================================== */
(function () {
  'use strict';
  if (window.PDXImpact) return; // idempotent — never redefine

  var KEY = 'pdx_impact_v1';
  var COLLECTION = 'impact';
  var VERSION = 1;

  // Metric registry — display order is array order. `unique:true` metrics dedupe
  // by an id (so re-opening the same profile, or re-picking the same candidate,
  // counts once); the rest are plain event counters.
  var METRICS = [
    { key: 'researched', icon: '🔎', label: 'Candidates researched', blurb: 'profiles you opened to dig into a record' },
    { key: 'contacted',  icon: '✉️', label: 'Reps contacted',        blurb: 'times you reached out to an official' },
    { key: 'reforms',    icon: '📢', label: 'Reforms supported',      blurb: 'community reforms you backed' },
    { key: 'shared',     icon: '🗣️', label: 'Contributions shared',   blurb: 'evidence, leads & discussions you added' },
    { key: 'picks',      icon: '🗳️', label: 'Ballot picks saved',     blurb: 'candidates on your voting team' }
  ];
  var UNIQUE = { researched: true, picks: true };
  var METRIC_KEYS = METRICS.map(function (m) { return m.key; });

  function now() { try { return Date.now(); } catch (e) { return 0; } }
  function store() { return window.PDXStore || null; }

  /* ── state shape ───────────────────────────────────────────────────────────
     { version, enabled, startedAt, updatedAt,
       counts: { metric: n },
       seen:   { uniqueMetric: { id: 1 } } }  // dedupe sets for unique metrics  */
  function blank() {
    var counts = {}, seen = {};
    METRIC_KEYS.forEach(function (k) { counts[k] = 0; if (UNIQUE[k]) seen[k] = {}; });
    return { version: VERSION, enabled: false, startedAt: 0, updatedAt: 0, counts: counts, seen: seen };
  }

  // Coerce any parsed/pulled object into a valid, safe state — a malformed or
  // hostile blob can never break reads or inflate a count.
  function normalize(raw) {
    var s = blank();
    if (!raw || typeof raw !== 'object') return s;
    s.enabled = !!raw.enabled;
    s.startedAt = Math.max(0, parseInt(raw.startedAt, 10) || 0);
    s.updatedAt = Math.max(0, parseInt(raw.updatedAt, 10) || 0);
    var c = (raw.counts && typeof raw.counts === 'object') ? raw.counts : {};
    var seen = (raw.seen && typeof raw.seen === 'object') ? raw.seen : {};
    METRIC_KEYS.forEach(function (k) {
      s.counts[k] = Math.max(0, parseInt(c[k], 10) || 0);
      if (UNIQUE[k]) {
        var src = (seen[k] && typeof seen[k] === 'object') ? seen[k] : {};
        for (var id in src) { if (Object.prototype.hasOwnProperty.call(src, id) && src[id]) s.seen[k][String(id)] = 1; }
        // Keep the displayed count honest for unique metrics: it is the set size.
        s.counts[k] = Math.max(s.counts[k], Object.keys(s.seen[k]).length);
      }
    });
    return s;
  }

  function load() {
    var st = store();
    if (st && typeof st.read === 'function') return normalize(st.read(KEY, null));
    try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return blank(); }
  }

  // Persist. `dirty !== false` flags the 'impact' collection for a sync push;
  // data that just came DOWN from the server is saved with dirty:false so a pull
  // never manufactures a spurious push.
  function save(s, dirty) {
    s.updatedAt = now();
    var st = store();
    if (st && typeof st.write === 'function') {
      st.write(KEY, s, { collection: COLLECTION, dirty: dirty !== false });
    } else {
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    }
    emitChange();
    return s;
  }

  function emitChange() {
    try { window.dispatchEvent(new CustomEvent('pdx-impact-change')); } catch (e) {}
  }

  /* ── public recording API ──────────────────────────────────────────────────
     record(metric, id?) — the single entry point features call. It is a strict
     no-op while the tracker is disabled, which is the whole opt-in guarantee. */
  function record(metric, id) {
    if (METRIC_KEYS.indexOf(metric) === -1) return false;
    var s = load();
    if (!s.enabled) return false;                 // opt-in gate — nothing tracked
    if (UNIQUE[metric]) {
      var k = String(id == null ? '' : id);
      if (!k) return false;                        // unique metrics require an id
      if (s.seen[metric][k]) return false;         // already counted — dedupe
      s.seen[metric][k] = 1;
      s.counts[metric] = Object.keys(s.seen[metric]).length;
    } else {
      s.counts[metric] = (s.counts[metric] || 0) + 1;
    }
    save(s);
    return true;
  }

  function isEnabled() { return load().enabled; }

  function enable() {
    var s = load();
    if (!s.enabled) { s.enabled = true; if (!s.startedAt) s.startedAt = now(); }
    save(s);
    // Backfill the low-friction signals that already exist in the user's state
    // the moment they opt in, so the widget isn't empty on day one.
    backfillPicks();
    return true;
  }

  function disable() { var s = load(); s.enabled = false; save(s); return true; }

  // Reset every tally to zero. Keeps the current enabled state (turning off is a
  // separate action) but restarts the "since" clock so the footprint reads fresh.
  function clear() {
    var was = load().enabled;
    var fresh = blank();
    fresh.enabled = was;
    fresh.startedAt = was ? now() : 0;
    save(fresh);
    return true;
  }

  function stats() {
    var s = load();
    var total = 0;
    METRIC_KEYS.forEach(function (k) { total += (s.counts[k] || 0); });
    return {
      enabled: s.enabled, startedAt: s.startedAt, updatedAt: s.updatedAt,
      counts: s.counts, total: total, metrics: METRICS.slice()
    };
  }

  /* ── committed ballot picks → 'picks' (unique by pid) ───────────────────────
     Rather than editing every pick call site, derive picks from the team source
     of truth on the pdx-team-change event (and once on opt-in). Unique-by-pid so
     it only ever grows — a removed pick doesn't shrink a lifetime "footprint". */
  function backfillPicks() {
    if (!isEnabled()) return;
    try {
      var pids = [];
      if (window.PDXTeamV2 && typeof window.PDXTeamV2.getPicks === 'function') {
        pids = window.PDXTeamV2.getPicks().map(function (r) { return r && r.pid; });
      }
      pids.filter(Boolean).forEach(function (pid) { record('picks', pid); });
    } catch (e) {}
  }

  /* ── PDXStore sync wiring ────────────────────────────────────────────────────
     Register the collection, a snapshot provider (what a push sends), and a
     reconciler (how a pulled snapshot merges into local). The merge is designed
     for a single user's own devices: union the dedupe sets and take the per-metric
     MAX of the counters. MAX is idempotent (re-pulling the same snapshot is a
     no-op) and can never LOSE the larger record; its one trade-off is that two
     devices that each recorded event-counter actions purely offline merge to the
     larger of the two rather than the sum — an acceptable, non-inflating choice
     for a motivational tally. Unique metrics are exact (the union size is truth).
     A locally-dirty collection keeps its un-pushed edits: they win the merge and
     are re-pushed, so a pull can never quietly erase actions this device saw. */
  function registerSync() {
    var st = store();
    if (!st) return;
    try {
      if (typeof st.defineCollection === 'function') {
        st.defineCollection(COLLECTION, { keys: [KEY], label: 'Your private impact stats' });
      }
      if (typeof st.registerSnapshot === 'function') {
        st.registerSnapshot(COLLECTION, function () { return load(); });
      }
      if (typeof st.registerReconciler === 'function') {
        st.registerReconciler(COLLECTION, function (serverSnap, meta) {
          if (!serverSnap || typeof serverSnap !== 'object') return { changed: false };
          var local = load();
          var server = normalize(serverSnap);
          var merged = blank();
          // enabled / startedAt follow the most-recently-updated side; a user who
          // turned it on anywhere stays on until they explicitly turn it off.
          var serverNewer = server.updatedAt > local.updatedAt;
          merged.enabled = serverNewer ? server.enabled : local.enabled;
          var stamps = [local.startedAt, server.startedAt].filter(function (n) { return n > 0; });
          merged.startedAt = stamps.length ? Math.min.apply(null, stamps) : 0;
          METRIC_KEYS.forEach(function (k) {
            if (UNIQUE[k]) {
              var union = {};
              var a = local.seen[k] || {}, b = server.seen[k] || {}, id;
              for (id in a) union[id] = 1;
              for (id in b) union[id] = 1;
              merged.seen[k] = union;
              merged.counts[k] = Object.keys(union).length;
            } else {
              merged.counts[k] = Math.max(local.counts[k] || 0, server.counts[k] || 0);
            }
          });
          // If local had un-pushed edits, keep the merged union dirty so it pushes
          // back up; otherwise store clean (it agrees with the server).
          var wasDirty = !!(meta && meta.dirty);
          save(merged, wasDirty);
          return { changed: true };
        });
      }
    } catch (e) { /* sync is best-effort; local-only still works */ }
  }

  /* ── the widget ─────────────────────────────────────────────────────────────
     Mounted as a sibling right after #your-ballot (falls back to before
     #voter-hub, then to the end of <main>/<body>). Rebuilt wholesale on each
     change — it's tiny — which keeps state and DOM trivially in sync. */
  var MOUNT_ID = 'pdx-impact';
  var _menuOpen = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function anchorParentInsert(node) {
    var yb = document.getElementById('your-ballot');
    if (yb && yb.parentNode) { yb.parentNode.insertBefore(node, yb.nextSibling); return true; }
    var vh = document.getElementById('voter-hub');
    if (vh && vh.parentNode) { vh.parentNode.insertBefore(node, vh); return true; }
    var main = document.querySelector('main') || document.body;
    if (main) { main.appendChild(node); return true; }
    return false;
  }

  function ensureMount() {
    var node = document.getElementById(MOUNT_ID);
    if (node) return node;
    node = document.createElement('section');
    node.id = MOUNT_ID;
    node.className = 'pdx-impact';
    node.setAttribute('aria-label', 'Your personal impact');
    if (!anchorParentInsert(node)) return null;
    return node;
  }

  function sinceLabel(ms) {
    if (!ms) return '';
    try {
      var d = new Date(ms);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function renderOptIn(node) {
    node.classList.remove('is-on');
    node.classList.add('is-off');
    node.innerHTML =
      '<div class="pdx-impact-card pdx-impact-invite">' +
        '<div class="pdx-impact-invite-ico" aria-hidden="true">📊</div>' +
        '<div class="pdx-impact-invite-body">' +
          '<div class="pdx-impact-invite-title">See your civic footprint</div>' +
          '<p class="pdx-impact-invite-sub">Keep a private tally of what <em>you</em> do here — candidates you research, reps you contact, reforms you back. Only you can see it, it stays on your account, and you can clear it anytime.</p>' +
        '</div>' +
        '<button type="button" class="pdx-impact-btn pdx-impact-btn-primary" data-impact-enable="1">Turn on my tracker</button>' +
      '</div>';
  }

  function renderDashboard(node) {
    node.classList.remove('is-off');
    node.classList.add('is-on');
    var s = stats();
    var tiles = s.metrics.map(function (m) {
      var n = s.counts[m.key] || 0;
      return '<div class="pdx-impact-tile' + (n > 0 ? ' has-count' : '') + '">' +
          '<span class="pdx-impact-tile-ico" aria-hidden="true">' + m.icon + '</span>' +
          '<span class="pdx-impact-tile-n">' + n.toLocaleString() + '</span>' +
          '<span class="pdx-impact-tile-lbl">' + esc(m.label) + '</span>' +
          '<span class="pdx-impact-tile-blurb">' + esc(m.blurb) + '</span>' +
        '</div>';
    }).join('');

    var since = sinceLabel(s.startedAt);
    var head = s.total > 0
      ? 'You’ve taken <b>' + s.total.toLocaleString() + '</b> civic action' + (s.total === 1 ? '' : 's')
      : 'Your footprint starts now';
    var sub = s.total > 0
      ? (since ? 'Tracking since ' + esc(since) + ' · private to you' : 'Private to you')
      : 'Research a candidate, back a reform, or contact a rep — your actions show up here.';

    node.innerHTML =
      '<div class="pdx-impact-card">' +
        '<div class="pdx-impact-head">' +
          '<div class="pdx-impact-titles">' +
            '<div class="pdx-impact-eyebrow">📊 Your impact · <span class="pdx-impact-private">🔒 private</span></div>' +
            '<div class="pdx-impact-h">' + head + '</div>' +
            '<div class="pdx-impact-sub">' + sub + '</div>' +
          '</div>' +
          '<div class="pdx-impact-menu-wrap">' +
            '<button type="button" class="pdx-impact-gear" data-impact-menu="1" aria-haspopup="true" aria-expanded="' + (_menuOpen ? 'true' : 'false') + '" title="Tracker settings">⋯</button>' +
            (_menuOpen ?
              '<div class="pdx-impact-menu" role="menu">' +
                '<button type="button" role="menuitem" data-impact-clear="1">↺ Clear my stats</button>' +
                '<button type="button" role="menuitem" data-impact-disable="1">Turn off tracking</button>' +
                '<div class="pdx-impact-menu-note">Clearing zeroes your counts. Turning off stops tracking; your existing counts stay until you clear them.</div>' +
              '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="pdx-impact-grid">' + tiles + '</div>' +
      '</div>';
  }

  function renderWidget() {
    var node = ensureMount();
    if (!node) return;
    if (isEnabled()) renderDashboard(node);
    else { _menuOpen = false; renderOptIn(node); }
  }

  /* ── delegated interactions ─────────────────────────────────────────────── */
  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) {
      // Still catch mailto:/tel: on non-element targets defensively.
    } else {
      // Reps contacted: any mailto:/tel: link click anywhere in the app is a
      // "reached out to an official" signal. No app edits needed.
      var contactLink = t.closest('a[href^="mailto:"], a[href^="tel:"], [data-pdx-contact]');
      if (contactLink) { record('contacted'); /* fall through — don't block the link */ }

      // Widget controls (scoped to our mount).
      var mount = document.getElementById(MOUNT_ID);
      if (mount && mount.contains(t)) {
        if (t.closest('[data-impact-enable]')) { e.preventDefault(); enable(); renderWidget(); return; }
        if (t.closest('[data-impact-menu]'))   { e.preventDefault(); _menuOpen = !_menuOpen; renderWidget(); return; }
        if (t.closest('[data-impact-clear]'))  {
          e.preventDefault();
          if (window.confirm('Clear your personal impact stats? This zeroes every count and cannot be undone.')) { clear(); }
          _menuOpen = false; renderWidget(); return;
        }
        if (t.closest('[data-impact-disable]')) { e.preventDefault(); disable(); _menuOpen = false; renderWidget(); return; }
        return;
      }
    }
    // A click anywhere else closes an open menu.
    if (_menuOpen) { _menuOpen = false; renderWidget(); }
  }

  /* ── public API ──────────────────────────────────────────────────────────── */
  window.PDXImpact = {
    KEY: KEY, COLLECTION: COLLECTION,
    record: record,
    isEnabled: isEnabled, enable: enable, disable: disable, clear: clear,
    stats: stats, render: renderWidget
  };

  /* ── boot ──────────────────────────────────────────────────────────────── */
  function boot() {
    registerSync();
    renderWidget();
    document.addEventListener('click', onClick, true); // capture so link clicks still register
    // Re-render on our own changes and on cross-device pulls.
    window.addEventListener('pdx-impact-change', renderWidget);
    // Committed ballot picks (local or synced) feed the 'picks' metric and refresh
    // the widget when the team changes anywhere in the app.
    window.addEventListener('pdx-team-change', function () { backfillPicks(); renderWidget(); });
    // If Your Ballot mounts its section slightly later (async data), retry the
    // sibling placement a few times so the widget always lands beside it.
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var node = document.getElementById(MOUNT_ID);
      var yb = document.getElementById('your-ballot');
      // Re-home the widget directly after #your-ballot if it isn't already there.
      if (node && yb && node.previousElementSibling !== yb && yb.parentNode) {
        yb.parentNode.insertBefore(node, yb.nextSibling);
      }
      if (!node) renderWidget();
      if (tries > 12) clearInterval(iv);
    }, 700);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
