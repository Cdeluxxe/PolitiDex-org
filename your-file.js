/* ─────────────────────────────────────────────────────────────────────────────
   your-file.js — YOUR FILE: the reader's own positions on eight issues
   ─────────────────────────────────────────────────────────────────────────────
   THE ADDRESS THIS MODULE OWNS: #your-file. One hash, chosen over /me because
   this app already owns its hashes and /me would need a new rewrite; the overlay
   is opened by that hash, stamps that hash while it is open, and puts the hash
   back where it found it on close. It is NOT #open-forum and it never touches it.

   WHY IT EXISTS. Alignment and every ballot comparison in this app need one
   thing the app had no honest place to ask for: WHERE THE READER STANDS. Two
   surfaces looked like they were asking and neither was:

     · Forum chips are a conversation's topic tags. A chip is what a thread is
       about, not a position anybody holds.
     · The District Room poll is (district × issue) — a neighbourhood's answer to
       one question, tallied. It is not a personal file, it is not portable to a
       candidate comparison, and it lives behind residency.

   So this is the third thing, and it is the small one: eight rows, one answer
   each, saved to the signed-in uid. It is a FILE, not a survey, not a quiz and
   not a score.

   THE LOCKED LIST. Eight issues, in ISSUES below, and there is no ninth. The
   list is not read from ISSUE_MAP, not derived from CORE_NATIONAL_ISSUES, and not
   widened by anything at runtime — ISSUE_MAP carries 120-odd keys and a personal
   file that asks for all of them is a form nobody finishes. Where the brief's
   slug and the shipped slug differ, THE SHIPPED SLUG IS THE ONE STORED AND THE
   SHIPPED CHIP LABEL IS THE ONE PRINTED, so this file can never introduce a
   parallel issue vocabulary:

       brief slug          shipped ISSUE_MAP key
       ─────────────────   ─────────────────────
       lands_preserve      lands_preserve
       housing             housing
       housing_build       housing_build
       gun_rights          gun_rights
       education_public    public_schools
       education_choice    school_choice
       energy_production   energy_production
       taxes_lower         lower_taxes

   FOUR ANSWERS, ONE PER ISSUE. Support / Oppose / Mixed / Not sure. "Not sure"
   is a real answer and it is stored — it is how a reader says "do not put a side
   on this for me", which is a different fact from never having opened the file.
   It is also the one answer that puts NO side into the match: the app's standing
   rule is that a silence is dropped and reported rather than guessed, and a
   reader's own silence gets the same treatment a candidate's does.

   WHO IT SAVES FOR. The signed-in uid, through PDXStore's 'yourFile' collection
   — the same local-first + /api/pdx-sync path Saved evidence, My Team and My
   Stances use, so a snapshot is one opaque JSON row keyed by (uid, collection)
   in Netlify Database and no new table exists. Locally the key is namespaced per
   account for the same reason 'saved' namespaces its own, so two people sharing
   one browser can neither see nor merge each other's file. SIGNED OUT, THE EIGHT STILL SHOW
   AND NOTHING SAVES: every control is disabled and the panel says "Sign in to
   keep your file." A file with nobody's name on it is not a file.

   WHAT IT FEEDS. One consumer: the alignment read (Your Match · record). It is
   fed by PROJECTION rather than by a second resolver: each sided answer is
   pushed into the existing Alignment Signature through the tool's own public
   entry points (window.alignSetIntensity / window.alignToggleIssue), so the
   eight are scored by the engine that already exists. That is also what makes
   the file read FIRST on its eight keys — an answer REPLACES whatever level the
   Signature was holding for that key, at boot, on every answer, and again after
   a cross-device pull (adopt()). Two consequences worth stating: the engine's
   two scoring lanes are not edited by this feature at all, and "Not sure" is
   not a side — it WITHDRAWS the issue instead of guessing one, the same way an
   unanswered issue is dropped rather than assumed.

   WHAT IT NEVER WRITES. Not dd_poll_answers, not dd_threads, not a district
   room, not the forum, not a public profile, not a share link. There is no POST
   in this file at all: the only network this module can cause is PDXStore's own
   snapshot push for its own collection.

   WHAT IT IS NOT. No 0-100 "my match" number, no grade, no ranking, no party, no
   verdict palette, no pack, no payment, no message, no nav pill. The copy says
   what the file is for and what it is not, in one line, on the panel:
   "Your positions. Used to compare formal records. Not a vote. Not a district poll."
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.PDXYourFile) return;   // idempotent — never redefine

  // ── THE ADDRESS ───────────────────────────────────────────────────────────
  var HASH = '#your-file';

  // ── STORAGE ───────────────────────────────────────────────────────────────
  // KEY is the BASE key. The key actually read and written is per-account (see
  // activeKey below): "saved to the signed-in uid" has to be true on this device
  // and not only on the server, because two people share a browser. Without the
  // namespace, the pull reconciler would merge the previous account's answers
  // into the next one's snapshot and push them up under their name.
  var KEY = 'pdx_your_file_v1';     // the base localStorage key this file owns
  var COLLECTION = 'yourFile';      // PDXStore / pdx-sync collection name
  var VERSION = 1;

  // ── THE LOCKED LIST ───────────────────────────────────────────────────────
  // `ask` is the slug the brief names; `key` is the slug ISSUE_MAP ships. They
  // differ on three rows and the shipped one always wins (see the header).
  var ISSUES = [
    { ask: 'lands_preserve',    key: 'lands_preserve' },
    { ask: 'housing',           key: 'housing' },
    { ask: 'housing_build',     key: 'housing_build' },
    { ask: 'gun_rights',        key: 'gun_rights' },
    { ask: 'education_public',  key: 'public_schools' },
    { ask: 'education_choice',  key: 'school_choice' },
    { ask: 'energy_production', key: 'energy_production' },
    { ask: 'taxes_lower',       key: 'lower_taxes' }
  ];
  var KEYS = ISSUES.map(function (r) { return r.key; });
  var IS_MINE = {};
  KEYS.forEach(function (k) { IS_MINE[k] = 1; });

  // ── THE FOUR ANSWERS ──────────────────────────────────────────────────────
  var POSITIONS = [
    { key: 'support', label: 'Support', ico: '👍' },
    { key: 'oppose',  label: 'Oppose',  ico: '👎' },
    { key: 'mixed',   label: 'Mixed',   ico: '⚖️' },
    { key: 'unsure',  label: 'Not sure', ico: '❔' }
  ];
  var VALID = { support: 1, oppose: 1, mixed: 1, unsure: 1 };

  // Position → the Alignment engine's own 5-point level. Support and Oppose are
  // sides; Mixed is the engine's 'neutral' (it counts, lightly); Not sure is NOT
  // a level at all and returns null, which is what keeps it out of the match.
  var LEVEL = { support: 'support', oppose: 'oppose', mixed: 'neutral' };

  var COPY = {
    kick: 'Your file',
    title: 'Your positions on eight issues',
    line: 'Your positions. Used to compare formal records. Not a vote. Not a district poll.',
    signedIn: 'Saved to your account.',
    signedOut: 'Sign in to keep your file.',
    signIn: 'Sign in',
    close: 'Close your file',
    countOne: 'answer of 8 on file',
    countMany: 'answers of 8 on file'
  };

  var ID = 'pdx-your-file';
  var ID_TITLE = 'pdx-your-file-title';
  var ID_HEAD = 'pdx-your-file-head';
  var ID_BODY = 'pdx-your-file-scroll';

  function fn(x) { return typeof x === 'function'; }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function now() { return Date.now(); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function store() { try { return window.PDXStore || null; } catch (e) { return null; } }
  function issueMap() {
    try { return (window.ISSUE_MAP && typeof window.ISSUE_MAP === 'object') ? window.ISSUE_MAP : {}; }
    catch (e) { return {}; }
  }

  // The signed-in member, or null. Anonymous Firebase sessions are NOT a member:
  // an anonymous uid is minted per browser, so a file saved against one is not a
  // file that follows anybody.
  function user() {
    try {
      var a = (typeof auth !== 'undefined' && auth) ? auth
        : (window.firebase && fn(window.firebase.auth) ? window.firebase.auth() : null);
      var u = a && a.currentUser;
      return (u && !u.isAnonymous) ? u : null;
    } catch (e) { return null; }
  }
  function signedIn() { return !!user(); }

  // ── PER-ACCOUNT KEY (isolation) ───────────────────────────────────────────
  // Same shape as the 'saved' collection's isolation (see PDXSaved.activeKey in
  // index.html): guest reads the base key, a signed-in account reads its own
  // namespace, and an outgoing account's answers are LEFT in their namespace —
  // isolated, never cleared — so signing back in on this device restores them.
  // The guest key stays empty in practice, because set() refuses every write
  // while signed out; it exists so a read can never throw for want of a context.
  var _acct = null;
  function nsFor(uid) {
    // Firebase uids are already url-safe; sanitize anyway so a malformed id can
    // neither collide with another key nor break the namespace format.
    return KEY + '__u_' + String(uid).replace(/[^A-Za-z0-9_-]/g, '_');
  }
  function activeKey() { return _acct ? nsFor(_acct) : KEY; }
  function setAcct(uid) {
    var next = uid || null;
    if (next === _acct) return;
    _acct = next;
    adopt();     // the new account's own sides, into the signature
    render();    // and repaint, because the rows changed wholesale
  }

  // ── READ / WRITE ──────────────────────────────────────────────────────────
  function blank() { return { version: VERSION, answers: {}, updatedAt: 0 }; }

  // Normalizing is the whole defence of the locked list on the way IN: a key
  // that is not one of the eight, and a position that is not one of the four,
  // is dropped rather than stored. A snapshot pulled from another device (or an
  // older shell) can therefore never widen this file to a ninth row.
  function normalize(raw) {
    var s = blank();
    if (!raw || typeof raw !== 'object') return s;
    var src = (raw.answers && typeof raw.answers === 'object') ? raw.answers : {};
    Object.keys(src).forEach(function (k) {
      if (!IS_MINE[k]) return;
      var r = src[k];
      var pos = r && typeof r === 'object' ? r.position : r;
      if (!VALID[pos]) return;
      var at = (r && typeof r === 'object' && typeof r.updatedAt === 'number') ? r.updatedAt : 0;
      s.answers[k] = { position: pos, updatedAt: at > 0 ? at : 0 };
    });
    if (typeof raw.updatedAt === 'number' && raw.updatedAt > 0) s.updatedAt = raw.updatedAt;
    return s;
  }

  function load() {
    var k = activeKey();
    var st = store();
    if (st && fn(st.read)) return normalize(st.read(k, null));
    try { return normalize(JSON.parse(localStorage.getItem(k))); } catch (e) { return blank(); }
  }

  // dirty !== false marks the collection for a sync push. A merge coming DOWN
  // from another device writes with dirty:false so it cannot re-push itself.
  // The collection is named EXPLICITLY on every write, because a namespaced key
  // is not in the collection's declared key list and would otherwise not mark
  // the collection dirty — i.e. the answer would never be pushed.
  function save(s, dirty) {
    s.version = VERSION;
    var k = activeKey();
    var st = store();
    if (st && fn(st.write)) st.write(k, s, { collection: COLLECTION, dirty: dirty !== false });
    else { try { localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }
  }

  // ── PDXStore COLLECTION REGISTRATION (parse time) ─────────────────────────
  // Registered synchronously so the snapshot provider and the reconciler both
  // exist before account sync's startup pull/push fires.
  (function registerCollection() {
    var st = store();
    if (!st) return;
    try {
      if (fn(st.defineCollection)) {
        st.defineCollection(COLLECTION, { keys: [KEY], label: 'Your file — your positions on eight issues' });
      }
    } catch (e) {}
    try { if (fn(st.registerSnapshot)) st.registerSnapshot(COLLECTION, function () { return load(); }); } catch (e) {}
    // Auth can resolve BEFORE this deferred script parses, in which case the
    // one-shot account event was already missed — so adopt whatever context is
    // established, exactly as the 'saved' collection does.
    try { if (fn(st.getAccount)) _acct = st.getAccount() || null; } catch (e) {}
    try {
      if (!fn(st.registerReconciler)) return;
      st.registerReconciler(COLLECTION, function (serverSnap, meta) {
        if (!serverSnap || typeof serverSnap !== 'object') return { changed: false };
        var local = load();
        var server = normalize(serverSnap);
        var merged = blank();
        // Per issue, the newer edit wins. There are no tombstones because there
        // is no delete: an answer is replaced, never removed, and the absence of
        // a row already means "not answered".
        KEYS.forEach(function (k) {
          var a = local.answers[k], b = server.answers[k];
          var winner = (!a) ? b : (!b) ? a : (((b.updatedAt || 0) > (a.updatedAt || 0)) ? b : a);
          if (winner) merged.answers[k] = winner;
        });
        merged.updatedAt = Math.max(local.updatedAt || 0, server.updatedAt || 0);
        // Keep the collection dirty if we had un-pushed local edits, so the
        // union goes back up.
        save(merged, !!(meta && meta.dirty));
        adopt();
        render();
        return { changed: true };
      });
    } catch (e) {}
  })();

  // ── WHAT THE ALIGNMENT READ ASKS FOR ──────────────────────────────────────
  // Two accessors and nothing else. `position` is the raw answer for one of the
  // eight ('support' | 'oppose' | 'mixed' | 'unsure' | null). `level` is the
  // Alignment engine's own level for it, and it is null for 'unsure' and for
  // every key that is not one of the eight — which is the whole guarantee that
  // this file cannot answer for the other 110 keys.
  function position(issueKey) {
    if (!IS_MINE[issueKey]) return null;
    var r = load().answers[issueKey];
    return (r && VALID[r.position]) ? r.position : null;
  }
  function level(issueKey) {
    var p = position(issueKey);
    return (p && LEVEL[p]) ? LEVEL[p] : null;
  }
  function answered() {
    var s = load();
    return KEYS.filter(function (k) { return !!s.answers[k]; });
  }

  // ── PROJECTION INTO THE EXISTING ALIGNMENT SIGNATURE ──────────────────────
  // The engine only scores issues the reader has PICKED, and a dozen surfaces
  // gate their match readouts on that set being non-empty. So a sided answer
  // here adds its issue to that set through the tool's own public entry point —
  // no second selection store, and nothing invented: only these eight keys, and
  // only the ones with a side.
  function alignHas(k) {
    try { return !!(window._alignIssues && fn(window._alignIssues.has) && window._alignIssues.has(k)); }
    catch (e) { return false; }
  }
  function alignLevelOf(k) {
    // Membership implies the engine's default level unless an explicit intensity
    // overlay is stored. This mirrors the Alignment Tool's own contract.
    if (!alignHas(k)) return null;
    try { return (window._alignIntensity && window._alignIntensity[k]) || 'support'; }
    catch (e) { return 'support'; }
  }
  function projectOne(k, pos) {
    if (!IS_MINE[k]) return;
    var want = LEVEL[pos] || null;
    if (want) {
      if (!fn(window.alignSetIntensity)) return;
      if (alignLevelOf(k) === want) return;            // already there — no churn
      try { window.alignSetIntensity(k, want); } catch (e) {}
      return;
    }
    // 'Not sure' asserts no side, so it withdraws the one this file put there.
    if (!alignHas(k) || !fn(window.alignToggleIssue)) return;
    try { window.alignToggleIssue(k); } catch (e) {}
  }
  // Every sided answer, projected. Runs after a boot and after a pull, and is a
  // no-op on the device that authored the answers (projectOne compares first).
  function adopt() {
    var s = load();
    KEYS.forEach(function (k) {
      var r = s.answers[k];
      if (r && LEVEL[r.position]) projectOne(k, r.position);
    });
  }

  // ── THE ONE MUTATION ──────────────────────────────────────────────────────
  // One answer per issue: setting a position REPLACES whatever was there. It
  // refuses a key outside the eight, a position outside the four, and — the rule
  // the brief is explicit about — every write while signed out.
  function set(issueKey, pos) {
    if (!IS_MINE[issueKey] || !VALID[pos]) return false;
    if (!signedIn()) return false;
    var s = load();
    var prev = s.answers[issueKey];
    if (prev && prev.position === pos) return true;    // nothing moved
    var ts = now();
    s.answers[issueKey] = { position: pos, updatedAt: ts };
    s.updatedAt = ts;
    save(s, true);
    projectOne(issueKey, pos);
    _flash = issueKey;
    render();
    try {
      window.dispatchEvent(new CustomEvent('pdx-your-file-change', {
        detail: { issueKey: issueKey, position: pos }
      }));
    } catch (e) {}
    return true;
  }

  // ── THE PANEL ─────────────────────────────────────────────────────────────
  var _built = false;
  var _open = false;
  var _return = '';
  var _flash = null;

  function build() {
    if (_built) return el(ID);
    var d;
    try { d = document; } catch (e) { return null; }
    if (!d || !fn(d.createElement) || !d.body) return null;

    var overlay = d.createElement('div');
    overlay.id = ID;
    overlay.className = 'pdxyf';
    overlay.hidden = true;
    try {
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', ID_TITLE);
      overlay.setAttribute('aria-hidden', 'true');
    } catch (e) {}
    try { overlay.style.display = 'none'; } catch (e) {}

    var panel = d.createElement('div');
    panel.className = 'pdxyf-panel';

    var top = d.createElement('div');
    top.className = 'pdxyf-top';

    var head = d.createElement('div');
    head.id = ID_HEAD;
    head.className = 'pdxyf-head';

    var x = d.createElement('button');
    x.className = 'pdxyf-x';
    try {
      x.setAttribute('type', 'button');
      x.setAttribute('aria-label', COPY.close);
      x.setAttribute('title', 'Close');
      x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
    } catch (e) {}
    try { x.addEventListener('click', function () { close(); }); } catch (e) {}

    var body = d.createElement('div');
    body.id = ID_BODY;
    body.className = 'pdxyf-body';

    try { top.appendChild(head); top.appendChild(x); } catch (e) {}
    try { panel.appendChild(top); panel.appendChild(body); } catch (e) {}
    try { overlay.appendChild(panel); } catch (e) {}
    // Before the district panels when they exist, for the reason those two
    // document about each other: these panels share a z-index, so document order
    // decides which covers which, and nothing should ever land on top of a file
    // the reader opened last.
    try {
      var host = el('pdx-district-file') || el('pdx-district-room') || el('modal-overlay');
      if (host && host.parentNode === d.body && fn(d.body.insertBefore)) d.body.insertBefore(overlay, host);
      else d.body.appendChild(overlay);
    } catch (e) {
      try { d.body.appendChild(overlay); } catch (e2) { return null; }
    }
    if (!el(ID)) return null;

    try {
      overlay.addEventListener('click', function (ev) { if (ev && ev.target === overlay) close(); });
    } catch (e) {}
    try {
      body.addEventListener('click', function (ev) {
        var t = ev && ev.target;
        if (!t || !t.closest) return;
        var b = t.closest('[data-pdxyf-set]');
        if (b) {
          var parts = String(b.getAttribute('data-pdxyf-set') || '').split('|');
          if (parts.length === 2) set(parts[0], parts[1]);
          return;
        }
        if (t.closest('[data-pdxyf-signin]')) signIn();
      });
    } catch (e) {}

    _built = true;
    return overlay;
  }

  // Reuse whatever sign-in entry point the app exposes; fall back to the nav
  // control, exactly as My Stances does. This module ships no auth UI of its own.
  function signIn() {
    var names = ['openAuthModal', 'openSignInModal', 'showLogin', 'pdxOpenAuth'];
    for (var i = 0; i < names.length; i++) {
      if (fn(window[names[i]])) { try { window[names[i]](); return; } catch (e) {} }
    }
    try {
      var btn = document.querySelector('#nav-auth-desktop button, #nav-auth-mobile button, [data-auth-signin]');
      if (btn && fn(btn.click)) btn.click();
    } catch (e) {}
  }

  // ── PAINT ─────────────────────────────────────────────────────────────────
  // The chip is the SHIPPED label and the SHIPPED one-line statement from
  // ISSUE_MAP — never a label this file wrote — so a row here and the same issue
  // anywhere else in the app read as the same issue. A key missing from
  // ISSUE_MAP (an old shell, a data file that failed to load) prints its slug
  // rather than disappearing: a row the reader answered must not vanish.
  function chipStyle(k) {
    try {
      var C = window.PDXIssueColors;
      if (C && fn(C.styleFor)) return ' style="' + C.styleFor(k, window.coreIssueForKey) + '"';
    } catch (e) {}
    return '';
  }

  function rowHtml(spec, rec, locked) {
    var def = issueMap()[spec.key] || null;
    var label = (def && def.label) || spec.key;
    var chip = (def && def.chip) || '';
    var mine = rec ? rec.position : '';
    var btns = POSITIONS.map(function (p) {
      var on = (mine === p.key);
      return '<button type="button" class="pdxyf-opt' + (on ? ' is-on' : '') + '"' +
        ' data-pdxyf-set="' + esc(spec.key) + '|' + esc(p.key) + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
        (locked ? ' disabled aria-disabled="true"' : '') +
        ' title="' + esc(p.label) + ' — ' + esc(label) + '">' +
        '<span class="pdxyf-optico" aria-hidden="true">' + p.ico + '</span>' +
        '<span class="pdxyf-optlb">' + esc(p.label) + '</span>' +
        '</button>';
    }).join('');
    return '<li class="pdxyf-row' + (_flash === spec.key ? ' pdxyf-flash' : '') + '"' +
        ' data-pdxyf-row="' + esc(spec.key) + '">' +
      '<div class="pdxyf-issue">' +
        '<span class="pdxyf-chip"' + chipStyle(spec.key) + '>' + esc(label) + '</span>' +
        (chip ? '<span class="pdxyf-chipline">' + esc(chip) + '</span>' : '') +
      '</div>' +
      '<div class="pdxyf-opts" role="group" aria-label="' + esc(label) + ' — your position">' + btns + '</div>' +
    '</li>';
  }

  function headHtml(n) {
    return '<p class="pdxyf-kick">' + esc(COPY.kick) + '</p>' +
      '<h2 class="pdxyf-title" id="' + ID_TITLE + '">' + esc(COPY.title) + '</h2>' +
      '<p class="pdxyf-line">' + esc(COPY.line) + '</p>' +
      '<p class="pdxyf-count">' + n + ' ' + esc(n === 1 ? COPY.countOne : COPY.countMany) + '</p>';
  }

  function bodyHtml() {
    var s = load();
    var locked = !signedIn();
    var acct = locked
      ? '<p class="pdxyf-acct pdxyf-acct--out">' +
          '<span class="pdxyf-acctico" aria-hidden="true">💾</span>' +
          '<span>' + esc(COPY.signedOut) +
            ' <button type="button" class="pdxyf-link" data-pdxyf-signin="1">' + esc(COPY.signIn) + '</button>' +
          '</span></p>'
      : '<p class="pdxyf-acct pdxyf-acct--in">' +
          '<span class="pdxyf-acctico" aria-hidden="true">🔒</span>' +
          '<span>' + esc(COPY.signedIn) + '</span></p>';
    return acct +
      '<ul class="pdxyf-list">' +
        ISSUES.map(function (spec) { return rowHtml(spec, s.answers[spec.key], locked); }).join('') +
      '</ul>';
  }

  function render() {
    var head = el(ID_HEAD);
    var body = el(ID_BODY);
    if (!head && !body) return;
    var n = answered().length;
    if (head) { try { head.innerHTML = headHtml(n); } catch (e) {} }
    if (body) { try { body.innerHTML = bodyHtml(); } catch (e) {} }
    _flash = null;
  }

  function lock() { try { document.body.style.overflow = 'hidden'; } catch (e) {} }
  function unlock() { try { document.body.style.overflow = ''; } catch (e) {} }

  function stamp() {
    try {
      if (location.hash === HASH) return;
      _return = location.hash || '';
      if (history && fn(history.pushState)) history.pushState({ pdxyf: 1 }, '', HASH);
      else location.hash = HASH;
    } catch (e) {}
  }
  function restore() {
    try {
      if (location.hash !== HASH) return;
      var back = location.pathname + (location.search || '') + (_return && _return !== HASH ? _return : '');
      if (history && fn(history.pushState)) history.pushState({ pdxyf: 0 }, '', back);
    } catch (e) {}
  }

  // ── OPEN / CLOSE ──────────────────────────────────────────────────────────
  function open() {
    var overlay = build();
    if (!overlay) return false;
    _open = true;
    render();
    try { overlay.hidden = false; } catch (e) {}
    try { overlay.setAttribute('aria-hidden', 'false'); } catch (e) {}
    try { overlay.style.setProperty('display', 'flex', 'important'); } catch (e) {
      try { overlay.style.display = 'flex'; } catch (e2) {}
    }
    lock();
    stamp();
    try { var sc = el(ID_BODY); if (sc) sc.scrollTop = 0; } catch (e) {}
    return true;
  }

  function hide() {
    _open = false;
    var overlay = el(ID);
    if (overlay) {
      try { overlay.hidden = true; } catch (e) {}
      try { overlay.setAttribute('aria-hidden', 'true'); } catch (e) {}
      try { overlay.style.setProperty('display', 'none', 'important'); } catch (e) {
        try { overlay.style.display = 'none'; } catch (e2) {}
      }
    }
    unlock();
  }

  function close() {
    hide();
    restore();
    return false;
  }

  // ── WIRING ────────────────────────────────────────────────────────────────
  function wire() {
    try {
      document.addEventListener('click', function (ev) {
        if (!ev) return;
        var t = ev.target;
        if (!t || !t.closest) return;
        var o = t.closest('[data-pdxyf-open]');
        if (!o) return;
        if (ev.defaultPrevented || ev.button > 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        if (open()) ev.preventDefault();
      }, true);
    } catch (e) {}
    try {
      document.addEventListener('keydown', function (ev) {
        if (_open && ev && ev.key === 'Escape') { ev.preventDefault(); close(); }
      });
    } catch (e) {}
    // The hash IS the state, so a link, a paste, a bookmark and the back button
    // all land the same way.
    try {
      window.addEventListener('hashchange', function () {
        if (location.hash === HASH) { if (!_open) open(); }
        else if (_open) hide();
      });
    } catch (e) {}
    try {
      window.addEventListener('popstate', function () {
        if (location.hash === HASH) { if (!_open) open(); }
        else if (_open) hide();
      });
    } catch (e) {}
    // Signing in or out changes whether anything can be saved, so the panel has
    // to be repainted rather than left showing the previous session's state. The
    // eight are also re-projected: a member who answered on another device gets
    // their sides into the signature as soon as the pull lands.
    try {
      var a = (typeof auth !== 'undefined' && auth) ? auth : null;
      if (a && fn(a.onAuthStateChanged)) {
        a.onAuthStateChanged(function () { adopt(); render(); });
      }
    } catch (e) {}
    // The isolation switch. PDXStore fires this with { userId } on every account
    // change — a uid on sign-in, null on sign-out — and it is what repoints the
    // key at the right person's file.
    try {
      window.addEventListener('pdx-account-change', function (e) {
        setAcct(e && e.detail && e.detail.userId);
      });
    } catch (e) {}
  }

  window.PDXYourFile = {
    HASH: HASH,
    KEY: KEY,
    activeKey: activeKey,
    setAccount: setAcct,
    COLLECTION: COLLECTION,
    ISSUES: ISSUES,
    KEYS: KEYS,
    POSITIONS: POSITIONS,
    LEVEL: LEVEL,
    COPY: COPY,
    open: open,
    close: close,
    isOpen: function () { return !!_open; },
    set: set,
    // The two accessors the alignment read uses (see alignment-tool.js).
    position: position,
    level: level,
    answers: function () { return load().answers; },
    answered: answered,
    adopt: adopt,
    render: render,
    // Exposed for the suite: the painted body, asserted directly rather than
    // reconstructed from source text.
    bodyHtml: bodyHtml
  };

  wire();

  // ── ARRIVAL ───────────────────────────────────────────────────────────────
  // A cold visit to /#your-file opens the file. Projection runs either way, so
  // the alignment read has the reader's sides without the panel ever being
  // opened on this device.
  (function boot() {
    var kicked = false;
    var kick = function () {
      if (kicked) return;
      kicked = true;
      adopt();
      try { if (location.hash === HASH) open(); } catch (e) {}
    };
    try { setTimeout(kick, 0); } catch (e) {}
    try { window.addEventListener('load', kick); } catch (e) {}
  })();
})();
