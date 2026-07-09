/* ============================================================================
   Personal Impact Tracker — your own civic footprint, private by default.

   WHAT THIS IS
   ------------
   A lightweight, OPT-IN widget that shows a signed-in (or local) user a private
   tally of their OWN actions in PolitiDex — candidates researched, evidence
   reviewed, issues followed, reps contacted, reforms supported, contributions
   shared, discussions joined, ballot picks saved — plus a gentle "civic streak"
   and a private full-detail view. It is encouragement, not a scoreboard: it
   counts the user's own activity, pushes no agenda, ranks nothing, and is visible
   only to them.

   PRIVACY & CONSENT (the two rules that shape everything below)
   ------------------------------------------------------------
   1. OPT-IN: nothing is ever recorded until the user turns the tracker on. Every
      record() call is a no-op while disabled, so a user who never opts in leaves
      no footprint at all.
   2. PRIVATE + EASY TO CLEAR: the data lives in the user's own storage and, when
      signed in, syncs across THEIR devices through the exact same PDXStore /
      /api/pdx-sync path the app already uses for saved evidence and their team
      (one row per user, keyed by the verified Firebase uid — never shared). A one
      tap, CONFIRMED "Clear" zeroes it; a one-tap, CONFIRMED "Turn off" stops it.

   HOW IT PLUGS IN
   ---------------
   • Storage + sync: a single JSON blob under the localStorage key `pdx_impact_v1`,
     owned by a PDXStore collection 'impact'. Writes route through PDXStore so the
     collection dirty-tracks and auto-pushes; a registered snapshot/reconciler
     gives it two-way, tombstone-free merge with the same guarantees as 'saved'.
   • Recording: window.PDXImpact.record(metric, id?) is called from confirmed
     success points in the app (index.html: openModal → 'researched', mandate
     support → 'reforms', community/forum submit → 'shared', comment/reply submit
     → 'discussed'). This file ALSO self-wires signals that need no app edits:
     mailto:/tel: clicks → 'contacted', committed ballot picks → 'picks' (via
     pdx-team-change), item reactions on issues → 'issues', and opening the
     Evidence Locker → 'reviewed' (both by wrapping existing globals).
   • Display: a self-contained card mounted as a SIBLING right after the
     #your-ballot section (so Your Ballot's own innerHTML re-renders never wipe
     it), plus an on-demand private "full impact" modal.
   ========================================================================== */
(function () {
  'use strict';
  if (window.PDXImpact) return; // idempotent — never redefine

  var KEY = 'pdx_impact_v1';
  var COLLECTION = 'impact';
  var VERSION = 2; // v2 added streak days + issues/reviewed/discussed metrics

  // Metric registry — display order is array order. `unique:true` metrics dedupe
  // by an id (so re-opening the same profile, re-following an issue, etc. counts
  // once); the rest are plain event counters.
  var METRICS = [
    { key: 'researched', icon: '🔎', label: 'Candidates researched', blurb: 'profiles you opened to dig into a record' },
    { key: 'reviewed',   icon: '📚', label: 'Evidence reviewed',      blurb: 'library views you opened to check receipts' },
    { key: 'issues',     icon: '🎯', label: 'Issues followed',        blurb: 'issue stances you engaged with' },
    { key: 'contacted',  icon: '✉️', label: 'Reps contacted',         blurb: 'times you reached out to an official' },
    { key: 'reforms',    icon: '📢', label: 'Reforms supported',      blurb: 'community reforms you backed' },
    { key: 'shared',     icon: '🗣️', label: 'Contributions shared',   blurb: 'evidence, leads & threads you started' },
    { key: 'discussed',  icon: '💬', label: 'Discussions joined',     blurb: 'comments & replies you posted' },
    { key: 'picks',      icon: '🗳️', label: 'Ballot picks saved',     blurb: 'candidates on your voting team' }
  ];
  var UNIQUE = { researched: true, reviewed: true, issues: true, picks: true };
  var METRIC_KEYS = METRICS.map(function (m) { return m.key; });

  function now() { try { return Date.now(); } catch (e) { return 0; } }
  function store() { return window.PDXStore || null; }

  /* ── date / day helpers (local time, so a "civic streak" matches the user) ── */
  function dayKey(ms) {
    var d = new Date(ms);
    var y = d.getFullYear(), m = ('0' + (d.getMonth() + 1)).slice(-2), day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }
  function keyToMs(key) {
    var p = String(key).split('-');
    if (p.length !== 3) return 0;
    return new Date(+p[0], (+p[1]) - 1, +p[2]).getTime();
  }
  function shiftDay(ms, delta) { var d = new Date(ms); d.setDate(d.getDate() + delta); return d.getTime(); }

  /* ── state shape ───────────────────────────────────────────────────────────
     { version, enabled, startedAt, updatedAt,
       counts: { metric: n },
       seen:   { uniqueMetric: { id: 1 } },   // dedupe sets for unique metrics
       days:   { 'YYYY-MM-DD': 1 } }           // active days (drives the streak) */
  function blank() {
    var counts = {}, seen = {};
    METRIC_KEYS.forEach(function (k) { counts[k] = 0; if (UNIQUE[k]) seen[k] = {}; });
    return { version: VERSION, enabled: false, startedAt: 0, updatedAt: 0, counts: counts, seen: seen, days: {} };
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
    var days = (raw.days && typeof raw.days === 'object') ? raw.days : {};
    for (var dk in days) {
      if (Object.prototype.hasOwnProperty.call(days, dk) && days[dk] && /^\d{4}-\d{2}-\d{2}$/.test(dk)) s.days[dk] = 1;
    }
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

  /* ── streak math (derived from the active-days set) ─────────────────────────
     currentStreak: consecutive active days ending today (or yesterday, so a day
     that hasn't ended yet doesn't look "broken"). longestStreak: the best run
     ever. Both are pure functions of `days`, so they survive sync unions cleanly. */
  function currentStreak(days) {
    if (!days) return 0;
    var t = now(), anchor;
    if (days[dayKey(t)]) anchor = t;
    else if (days[dayKey(shiftDay(t, -1))]) anchor = shiftDay(t, -1);
    else return 0;
    var streak = 0, cursor = anchor;
    while (days[dayKey(cursor)]) { streak++; cursor = shiftDay(cursor, -1); }
    return streak;
  }
  function longestStreak(days) {
    var keys = Object.keys(days || {});
    if (!keys.length) return 0;
    keys.sort();
    var best = 1, run = 1;
    for (var i = 1; i < keys.length; i++) {
      var expected = dayKey(shiftDay(keyToMs(keys[i - 1]), 1));
      run = (expected === keys[i]) ? run + 1 : 1;
      if (run > best) best = run;
    }
    return best;
  }
  // The active/inactive flags for the last `n` days, oldest → newest (for dots).
  function lastNDays(days, n) {
    var out = [], t = now();
    for (var i = n - 1; i >= 0; i--) {
      var ms = shiftDay(t, -i), k = dayKey(ms);
      out.push({ key: k, ms: ms, active: !!(days && days[k]), isToday: i === 0 });
    }
    return out;
  }

  /* ── public recording API ──────────────────────────────────────────────────
     record(metric, id?) — the single entry point features call. It is a strict
     no-op while the tracker is disabled, which is the whole opt-in guarantee.
     Every recorded action also stamps "today" into the active-days set so the
     civic streak reflects any engagement, even a deduped re-visit. */
  function record(metric, id) {
    if (METRIC_KEYS.indexOf(metric) === -1) return false;
    var s = load();
    if (!s.enabled) return false;                 // opt-in gate — nothing tracked
    var changed = false;
    var today = dayKey(now());
    if (!s.days[today]) { s.days[today] = 1; changed = true; }
    if (UNIQUE[metric]) {
      var k = String(id == null ? '' : id);
      if (k && !s.seen[metric][k]) {              // unique metrics require a new id
        s.seen[metric][k] = 1;
        s.counts[metric] = Object.keys(s.seen[metric]).length;
        changed = true;
      }
    } else {
      s.counts[metric] = (s.counts[metric] || 0) + 1;
      changed = true;
    }
    if (changed) save(s);
    return true;
  }

  function isEnabled() { return load().enabled; }

  function enable() {
    var s = load();
    if (!s.enabled) { s.enabled = true; if (!s.startedAt) s.startedAt = now(); s.days[dayKey(now())] = 1; }
    save(s);
    // Backfill the low-friction signals already in the user's state the moment
    // they opt in, so the widget isn't empty on day one.
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
    if (was) { fresh.startedAt = now(); fresh.days[dayKey(now())] = 1; }
    save(fresh);
    return true;
  }

  function stats() {
    var s = load();
    var total = 0;
    METRIC_KEYS.forEach(function (k) { total += (s.counts[k] || 0); });
    return {
      enabled: s.enabled, startedAt: s.startedAt, updatedAt: s.updatedAt,
      counts: s.counts, total: total, metrics: METRICS.slice(),
      streak: currentStreak(s.days), bestStreak: longestStreak(s.days),
      activeDays: Object.keys(s.days).length, days: s.days,
      last7: lastNDays(s.days, 7), last30: lastNDays(s.days, 30)
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

  /* ── self-wired hooks that need no app edits (wrap existing globals) ─────────
     These functions are defined by inline scripts earlier in the page, so they
     exist by the time this deferred module boots. We wrap them idempotently:
     record() first (a no-op unless opted in), then call through to the original.
       • _pdxToggleItemVote(btn, targetId, kind) — reacting to an "issue:" item is
         a lightweight "following this issue" signal (unique by target id).
       • _pdxOpenEvidenceLocker({pol, issue}) — opening the Evidence Locker is a
         "reviewed evidence" signal (unique by the pol/issue view opened). */
  function wrapFn(name, before) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__pdxImpactWrapped) return false;
    var wrapped = function () {
      try { before.apply(null, arguments); } catch (e) {}
      return orig.apply(this, arguments);
    };
    wrapped.__pdxImpactWrapped = true;
    try { window[name] = wrapped; } catch (e) { return false; }
    return true;
  }
  function wrapExternalHooks() {
    wrapFn('_pdxToggleItemVote', function (btn, targetId) {
      if (typeof targetId === 'string' && targetId.indexOf('issue:') === 0) record('issues', targetId);
    });
    wrapFn('_pdxOpenEvidenceLocker', function (arg) {
      var o = (arg && typeof arg === 'object') ? arg : {};
      var id = ((o.pol || '') + ':' + (o.issue || '')).replace(/^:+|:+$/g, '');
      record('reviewed', id || 'library');
    });
  }

  /* ── PDXStore sync wiring ────────────────────────────────────────────────────
     Register the collection, a snapshot provider (what a push sends), and a
     reconciler (how a pulled snapshot merges into local). The merge is designed
     for a single user's own devices: union the dedupe sets AND the active-days
     set, and take the per-metric MAX of the plain counters. MAX is idempotent
     (re-pulling the same snapshot is a no-op) and can never LOSE the larger
     record; its one trade-off is that two devices that each recorded event-counter
     actions purely offline merge to the larger of the two rather than the sum — an
     acceptable, non-inflating choice for a motivational tally. Unique metrics and
     the streak are EXACT (union size / union of days is truth). A locally-dirty
     collection keeps its un-pushed edits: they win the merge and are re-pushed, so
     a pull can never quietly erase actions this device saw. */
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
          var serverNewer = server.updatedAt > local.updatedAt;
          merged.enabled = serverNewer ? server.enabled : local.enabled;
          var stamps = [local.startedAt, server.startedAt].filter(function (n) { return n > 0; });
          merged.startedAt = stamps.length ? Math.min.apply(null, stamps) : 0;
          METRIC_KEYS.forEach(function (k) {
            if (UNIQUE[k]) {
              var union = {}, a = local.seen[k] || {}, b = server.seen[k] || {}, id;
              for (id in a) union[id] = 1;
              for (id in b) union[id] = 1;
              merged.seen[k] = union;
              merged.counts[k] = Object.keys(union).length;
            } else {
              merged.counts[k] = Math.max(local.counts[k] || 0, server.counts[k] || 0);
            }
          });
          // Union the active-days set so the streak reflects every device.
          var dk;
          for (dk in (local.days || {})) merged.days[dk] = 1;
          for (dk in (server.days || {})) merged.days[dk] = 1;
          // If local had un-pushed edits, keep the merged union dirty so it pushes
          // back up; otherwise store clean (it agrees with the server).
          save(merged, !!(meta && meta.dirty));
          return { changed: true };
        });
      }
    } catch (e) { /* sync is best-effort; local-only still works */ }
  }

  /* ── shared markup helpers ──────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function sinceLabel(ms) {
    if (!ms) return '';
    try { return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  function plural(n, one, many) { return n === 1 ? one : (many || one + 's'); }

  // An accessible SVG progress ring. `pct` in 0..1 fills the arc; `center` is the
  // big glyph/number in the middle. Weekly target is 7 days, so the ring fills as
  // a streak grows toward a week and stays full beyond it.
  function ringSVG(pct, center, ariaLabel) {
    var R = 26, C = 2 * Math.PI * R;
    var off = Math.max(0, Math.min(1, pct));
    var dash = C * (1 - off);
    return '<span class="pdx-impact-ring" role="img" aria-label="' + esc(ariaLabel) + '">' +
      '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">' +
        '<circle class="pdx-ring-track" cx="32" cy="32" r="' + R + '"></circle>' +
        '<circle class="pdx-ring-fill" cx="32" cy="32" r="' + R + '" ' +
          'style="stroke-dasharray:' + C.toFixed(1) + ';stroke-dashoffset:' + dash.toFixed(1) + '"></circle>' +
      '</svg>' +
      '<span class="pdx-impact-ring-center" aria-hidden="true">' + center + '</span>' +
    '</span>';
  }

  function streakBlock(s) {
    var streak = s.streak;
    var pct = Math.min(streak, 7) / 7;
    var center = '<b class="pdx-ring-num">' + streak + '</b>';
    var aria = streak > 0 ? ('Current civic streak: ' + streak + ' ' + plural(streak, 'day')) : 'No active streak yet';
    var caption = streak > 0
      ? '🔥 <b>' + streak + '-day</b> civic streak'
      : 'Start a civic streak today';
    var sub = s.bestStreak > 1 ? ('Best: ' + s.bestStreak + ' days') : (streak > 0 ? 'Keep it going!' : 'Any action counts');
    return '<div class="pdx-impact-streak">' +
        ringSVG(pct, center, aria) +
        '<div class="pdx-impact-streak-txt">' +
          '<div class="pdx-impact-streak-cap">' + caption + '</div>' +
          '<div class="pdx-impact-streak-sub">' + esc(sub) + '</div>' +
        '</div>' +
      '</div>';
  }

  // A 7-dot "this week" activity row (accessible label per dot).
  function weekDots(s) {
    var dots = s.last7.map(function (d) {
      var lbl = (d.isToday ? 'Today' : shortDay(d.ms)) + ': ' + (d.active ? 'active' : 'no activity');
      return '<span class="pdx-impact-dot' + (d.active ? ' on' : '') + (d.isToday ? ' today' : '') + '" title="' + esc(lbl) + '" aria-label="' + esc(lbl) + '"></span>';
    }).join('');
    return '<div class="pdx-impact-week" role="img" aria-label="Your activity over the last 7 days">' + dots + '</div>';
  }
  function shortDay(ms) {
    try { return new Date(ms).toLocaleDateString(undefined, { weekday: 'short' }); } catch (e) { return ''; }
  }

  /* ── the dashboard card ─────────────────────────────────────────────────────
     Mounted as a sibling right after #your-ballot (falls back to before
     #voter-hub, then to <main>/<body>). Rebuilt wholesale on each change — it's
     tiny — which keeps state and DOM trivially in sync. */
  var MOUNT_ID = 'pdx-impact';
  var OVERLAY_ID = 'pdx-impact-overlay';
  var _menuOpen = false;
  var _fullOpen = false;

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

  function menuHTML() {
    return '<div class="pdx-impact-menu-wrap">' +
        '<button type="button" class="pdx-impact-gear" data-impact-menu="1" aria-haspopup="true" aria-expanded="' + (_menuOpen ? 'true' : 'false') + '" aria-label="Tracker settings">⋯</button>' +
        (_menuOpen ?
          '<div class="pdx-impact-menu" role="menu">' +
            '<button type="button" role="menuitem" data-impact-clear="1">↺ Clear my stats</button>' +
            '<button type="button" role="menuitem" data-impact-disable="1">Turn off tracking</button>' +
            '<div class="pdx-impact-menu-note">Both ask for confirmation. Clearing zeroes your counts; turning off stops tracking (your counts stay until you clear them).</div>' +
          '</div>' : '') +
      '</div>';
  }

  function renderOptIn(node) {
    node.classList.remove('is-on');
    node.classList.add('is-off');
    node.innerHTML =
      '<div class="pdx-impact-card pdx-impact-invite">' +
        '<div class="pdx-impact-invite-ico" aria-hidden="true">📊</div>' +
        '<div class="pdx-impact-invite-body">' +
          '<div class="pdx-impact-invite-title">See your civic footprint</div>' +
          '<p class="pdx-impact-invite-sub">Keep a private tally of what <em>you</em> do here — candidates you research, evidence you check, issues you follow, reps you contact, reforms you back. Only you can see it, it stays on your account, and you can clear it anytime.</p>' +
        '</div>' +
        '<button type="button" class="pdx-impact-btn pdx-impact-btn-primary" data-impact-enable="1">Turn on my tracker</button>' +
      '</div>';
  }

  // Compact metric tiles for the card (top few) — the full grid lives in the modal.
  function tileHTML(m, n) {
    return '<div class="pdx-impact-tile' + (n > 0 ? ' has-count' : '') + '" role="group" aria-label="' + esc(m.label + ': ' + n) + '">' +
        '<span class="pdx-impact-tile-ico" aria-hidden="true">' + m.icon + '</span>' +
        '<span class="pdx-impact-tile-n">' + n.toLocaleString() + '</span>' +
        '<span class="pdx-impact-tile-lbl">' + esc(m.label) + '</span>' +
        '<span class="pdx-impact-tile-blurb">' + esc(m.blurb) + '</span>' +
      '</div>';
  }

  function renderDashboard(node) {
    node.classList.remove('is-off');
    node.classList.add('is-on');
    var s = stats();
    var tiles = s.metrics.map(function (m) { return tileHTML(m, s.counts[m.key] || 0); }).join('');
    var since = sinceLabel(s.startedAt);
    var head = s.total > 0
      ? 'You’ve taken <b>' + s.total.toLocaleString() + '</b> civic ' + plural(s.total, 'action')
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
          menuHTML() +
        '</div>' +
        '<div class="pdx-impact-streakwrap">' + streakBlock(s) + weekDots(s) + '</div>' +
        '<div class="pdx-impact-grid">' + tiles + '</div>' +
        '<div class="pdx-impact-foot">' +
          '<button type="button" class="pdx-impact-fulllink" data-impact-full="1" aria-haspopup="dialog">See my full impact →</button>' +
        '</div>' +
      '</div>';
  }

  function renderWidget() {
    var node = ensureMount();
    if (!node) return;
    if (isEnabled()) renderDashboard(node);
    else { _menuOpen = false; renderOptIn(node); }
  }

  /* ── the private "full impact" modal ─────────────────────────────────────────
     A client-only, private detail view (no server, no route). Charts are pure
     CSS/SVG (no dependency) so there is no canvas lifecycle to leak: horizontal
     bars for each metric and a 30-day activity strip. Accessible: role="dialog",
     aria-modal, labelled, Esc to close, backdrop click to close, focus moved in. */
  function barsHTML(s) {
    var max = 1;
    s.metrics.forEach(function (m) { max = Math.max(max, s.counts[m.key] || 0); });
    return s.metrics.map(function (m) {
      var n = s.counts[m.key] || 0;
      var pct = Math.round((n / max) * 100);
      return '<div class="pdx-impact-bar-row' + (n > 0 ? ' has-count' : '') + '">' +
          '<span class="pdx-impact-bar-lbl"><span aria-hidden="true">' + m.icon + '</span> ' + esc(m.label) + '</span>' +
          '<span class="pdx-impact-bar-track">' +
            '<span class="pdx-impact-bar-fill" style="width:' + (n > 0 ? Math.max(pct, 6) : 0) + '%"></span>' +
          '</span>' +
          '<span class="pdx-impact-bar-n">' + n.toLocaleString() + '</span>' +
        '</div>';
    }).join('');
  }

  function activityStripHTML(s) {
    var cells = s.last30.map(function (d) {
      var lbl = fullDay(d.ms) + ': ' + (d.active ? 'active' : 'no activity');
      return '<span class="pdx-impact-cell' + (d.active ? ' on' : '') + (d.isToday ? ' today' : '') + '" title="' + esc(lbl) + '" aria-label="' + esc(lbl) + '"></span>';
    }).join('');
    return '<div class="pdx-impact-strip" role="img" aria-label="Your activity over the last 30 days">' + cells + '</div>';
  }
  function fullDay(ms) {
    try { return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
    catch (e) { return ''; }
  }

  function renderFull(overlay) {
    var s = stats();
    var since = sinceLabel(s.startedAt);
    overlay.innerHTML =
      '<div class="pdx-impact-modal" role="dialog" aria-modal="true" aria-labelledby="pdx-impact-modal-title">' +
        '<div class="pdx-impact-modal-head">' +
          '<div>' +
            '<div class="pdx-impact-eyebrow">📊 Your impact · <span class="pdx-impact-private">🔒 private to you</span></div>' +
            '<h2 class="pdx-impact-modal-title" id="pdx-impact-modal-title">Your civic footprint</h2>' +
            (since ? '<div class="pdx-impact-sub">Tracking since ' + esc(since) + '</div>' : '') +
          '</div>' +
          '<button type="button" class="pdx-impact-close" data-impact-close="1" aria-label="Close">✕</button>' +
        '</div>' +

        '<div class="pdx-impact-modal-body">' +
          '<div class="pdx-impact-summary">' +
            streakBlock(s) +
            '<div class="pdx-impact-summary-stats">' +
              '<div class="pdx-impact-stat"><b>' + s.total.toLocaleString() + '</b><span>total ' + plural(s.total, 'action') + '</span></div>' +
              '<div class="pdx-impact-stat"><b>' + s.activeDays.toLocaleString() + '</b><span>active ' + plural(s.activeDays, 'day') + '</span></div>' +
              '<div class="pdx-impact-stat"><b>' + s.bestStreak.toLocaleString() + '</b><span>best streak</span></div>' +
            '</div>' +
          '</div>' +

          '<h3 class="pdx-impact-h3">By action</h3>' +
          '<div class="pdx-impact-bars">' + barsHTML(s) + '</div>' +

          '<h3 class="pdx-impact-h3">Last 30 days</h3>' +
          activityStripHTML(s) +
          '<p class="pdx-impact-legend"><span class="pdx-impact-cell on" aria-hidden="true"></span> a day you took a civic action</p>' +
        '</div>' +

        '<div class="pdx-impact-modal-foot">' +
          '<p class="pdx-impact-foot-note">🔒 These numbers are private to you and never shown to anyone else. They sync only across your own signed-in devices.</p>' +
          '<div class="pdx-impact-foot-btns">' +
            '<button type="button" class="pdx-impact-btn" data-impact-clear="1">↺ Clear my stats</button>' +
            '<button type="button" class="pdx-impact-btn" data-impact-disable="1">Turn off tracking</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function ensureOverlay() {
    var o = document.getElementById(OVERLAY_ID);
    if (o) return o;
    o = document.createElement('div');
    o.id = OVERLAY_ID;
    o.className = 'pdx-impact-overlay';
    o.setAttribute('hidden', '');
    (document.body || document.documentElement).appendChild(o);
    return o;
  }

  var _lastFocus = null;
  function openFull() {
    if (!isEnabled()) return;
    var o = ensureOverlay();
    _lastFocus = document.activeElement;
    renderFull(o);
    o.removeAttribute('hidden');
    // Defer the visible class so the CSS transition runs.
    try { window.requestAnimationFrame(function () { o.classList.add('is-open'); }); } catch (e) { o.classList.add('is-open'); }
    document.documentElement.classList.add('pdx-impact-modal-open');
    _fullOpen = true;
    var closeBtn = o.querySelector('[data-impact-close]');
    if (closeBtn && closeBtn.focus) { try { closeBtn.focus(); } catch (e) {} }
  }
  function closeFull() {
    var o = document.getElementById(OVERLAY_ID);
    _fullOpen = false;
    document.documentElement.classList.remove('pdx-impact-modal-open');
    if (!o) return;
    o.classList.remove('is-open');
    o.setAttribute('hidden', '');
    if (_lastFocus && _lastFocus.focus) { try { _lastFocus.focus(); } catch (e) {} }
  }

  /* ── confirmed, one-tap destructive actions ─────────────────────────────── */
  function doClear() {
    if (window.confirm('Clear your personal impact stats? This zeroes every count and streak, and cannot be undone.')) {
      clear();
      return true;
    }
    return false;
  }
  function doDisable() {
    if (window.confirm('Turn off your impact tracker? Tracking stops right away. Your existing counts stay until you clear them, and you can turn it back on anytime.')) {
      disable();
      return true;
    }
    return false;
  }

  /* ── delegated interactions ─────────────────────────────────────────────── */
  function onClick(e) {
    var t = e.target;
    if (t && t.closest) {
      // Reps contacted: any mailto:/tel: link click anywhere in the app is a
      // "reached out to an official" signal. No app edits needed.
      var contactLink = t.closest('a[href^="mailto:"], a[href^="tel:"], [data-pdx-contact]');
      if (contactLink) { record('contacted'); /* fall through — don't block the link */ }

      // Controls live in either the card mount or the modal overlay.
      var mount = document.getElementById(MOUNT_ID);
      var overlay = document.getElementById(OVERLAY_ID);
      var inMount = mount && mount.contains(t);
      var inOverlay = overlay && overlay.contains(t);

      if (inMount || inOverlay) {
        if (t.closest('[data-impact-enable]'))  { e.preventDefault(); enable(); renderWidget(); return; }
        if (t.closest('[data-impact-menu]'))    { e.preventDefault(); _menuOpen = !_menuOpen; renderWidget(); return; }
        if (t.closest('[data-impact-full]'))    { e.preventDefault(); _menuOpen = false; renderWidget(); openFull(); return; }
        if (t.closest('[data-impact-close]'))   { e.preventDefault(); closeFull(); return; }
        if (t.closest('[data-impact-clear]'))   {
          e.preventDefault();
          if (doClear()) { if (_fullOpen) renderFull(overlay); }
          _menuOpen = false; renderWidget(); return;
        }
        if (t.closest('[data-impact-disable]')) {
          e.preventDefault();
          if (doDisable()) { closeFull(); }
          _menuOpen = false; renderWidget(); return;
        }
        // A click on the overlay backdrop (outside the modal panel) closes it.
        if (inOverlay && t === overlay) { closeFull(); return; }
        return;
      }
    }
    // A click anywhere else closes an open menu.
    if (_menuOpen) { _menuOpen = false; renderWidget(); }
  }

  function onKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (_fullOpen) { closeFull(); }
      else if (_menuOpen) { _menuOpen = false; renderWidget(); }
    }
  }

  /* ── public API ──────────────────────────────────────────────────────────── */
  window.PDXImpact = {
    KEY: KEY, COLLECTION: COLLECTION,
    record: record,
    isEnabled: isEnabled, enable: enable, disable: disable, clear: clear,
    stats: stats, render: renderWidget, openFull: openFull, closeFull: closeFull
  };

  /* ── boot ──────────────────────────────────────────────────────────────── */
  function boot() {
    registerSync();
    wrapExternalHooks();
    renderWidget();
    document.addEventListener('click', onClick, true); // capture so link clicks still register
    document.addEventListener('keydown', onKeydown);
    // Re-render on our own changes and on cross-device pulls (refresh the modal too).
    window.addEventListener('pdx-impact-change', function () {
      renderWidget();
      if (_fullOpen) { var o = document.getElementById(OVERLAY_ID); if (o) renderFull(o); }
    });
    // Committed ballot picks (local or synced) feed the 'picks' metric and refresh
    // the widget when the team changes anywhere in the app.
    window.addEventListener('pdx-team-change', function () { backfillPicks(); renderWidget(); });
    // Some globals we wrap, and #your-ballot, may settle slightly after us. Retry a
    // few times: re-home the widget beside Your Ballot and (re)wrap late globals.
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      wrapExternalHooks();
      var node = document.getElementById(MOUNT_ID);
      var yb = document.getElementById('your-ballot');
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
