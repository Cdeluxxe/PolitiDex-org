/* ─────────────────────────────────────────────────────────────────────────────
   your-file.js — YOUR FILE: the reader's own positions on the issues
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

   So this is the third thing, and it is the small one: one answer per issue,
   saved to the signed-in uid. It is a FILE, not a survey, not a quiz and not a
   score.

   THE LIST IS THE VOCABULARY, AND IT IS DERIVED. The rows this file offers are
   the app's own issue vocabulary — every ISSUE_MAP key, grouped under the
   CORE_NATIONAL_ISSUES family that claims it, read at runtime from those two
   globals and never retyped here. That is the whole reason the count on /me can
   say "2 of N": the numerator and the denominator come from the same list, so a
   key added to ISSUE_MAP tomorrow is a row here and a point of denominator
   there without a second edit. There is no starter octet: the eight slugs this
   file shipped with survive only as FLOOR below, the rows that must exist even
   on a shell where ISSUE_MAP failed to parse, and on any shell where it parsed
   they are already inside their families and FLOOR adds nothing.

   A HUNDRED-ODD ROWS IS A FORM NOBODY FINISHES — IF YOU PAINT IT FLAT. So the
   list paints as one collapsed <details> per family, with that family's own
   "n of m set" on its summary; families holding an answer open themselves, and
   with nothing answered the first one is open. Nobody is asked to scroll 121
   rows to reach the one they came to answer.

   WHERE THE BRIEF'S SLUG AND THE SHIPPED SLUG DIFFER, THE SHIPPED SLUG IS THE
   ONE STORED AND THE SHIPPED CHIP LABEL IS THE ONE PRINTED, so this file can
   never introduce a parallel issue vocabulary: education_public is stored as
   public_schools, education_choice as school_choice, taxes_lower as lower_taxes.

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
   one browser can neither see nor merge each other's file. SIGNED OUT, THE ROWS
   STILL SHOW AND NOTHING SAVES: every control is disabled and the panel says "Sign in to
   keep your file." A file with nobody's name on it is not a file.

   WHAT IT FEEDS. One consumer: the alignment read (Your Match · record). It is
   fed by PROJECTION rather than by a second resolver: each sided answer is
   pushed into the existing Alignment Signature through the tool's own public
   entry points (window.alignSetIntensity / window.alignToggleIssue), so the
   answers are scored by the engine that already exists. That is also what makes
   the file read FIRST on a key it holds — an answer REPLACES whatever level the
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

  // ── AND THE ADDRESS IS NOW A DOCUMENT ─────────────────────────────────────
  // THE DEFECT. This hash was the editor of record, and it opened an overlay on
  // whatever document the reader happened to be standing on — which was the
  // homepage, because the account menu's "Your file" was an <a href="#your-file">
  // in a menu that only exists there. So the answers had no address of
  // their own: you could not bookmark them, you could not link a friend to
  // "where I keep my positions", and Back from the panel meant "the front page,
  // roughly where you were". The same account also had a SECOND door, "My
  // Views", which scrolled to a different region of that same homepage.
  //
  // /me IS NOW THAT ADDRESS, and this module has two jobs on the two kinds of
  // document it can find itself on:
  //
  //   ON /me  the rows are already ON the page — inline(), below, paints
  //           them into a host me-desk.js supplies. There is nothing to open:
  //           the hash and the account-menu click are satisfied by taking the
  //           reader to the region, which the desk does through its own ?tab=.
  //   ELSEWHERE  the hash is an ADDRESS, not a panel. Both entry points hop to
  //           /me and the overlay is never built.
  //
  // WHY replace AND NOT assign. This is a REDIRECT, not a navigation the reader
  // asked for: they typed, tapped or restored /#your-file and we are answering
  // with /me. An assign would leave the old address in the history, so one Back
  // would land on /#your-file, which would redirect again — a reader pressing
  // Back would be unable to leave. replace consumes the entry it arrived on, so
  // Back goes to whatever was before it, exactly once.
  //
  // AND WHY THE LATCH. Both entry points can fire for one gesture (the hash
  // lands AND a captured click resolves), and a replace() that is called twice
  // in one task is two redirects for one intent. _toMe makes it once per
  // document lifetime, which is all a redirect ever needs to be.
  //
  // THE OVERLAY MACHINERY IS KEPT, NOT DELETED, and that is deliberate. build(),
  // open(), hide(), close(), the Escape key and the hash/popstate listeners all
  // still work, and on a document that sets neither the flag nor a /me rewrite —
  // a local preview of an older shell, a stale service-worker entry — the panel
  // is still the behaviour. Deleting it would have been a large, untestable
  // removal in the same pass that moves the address; keeping it makes the
  // address contract single without making the module fragile.
  var ME = '/me';

  // ONE FLAG, ONE ACCESSOR. me.html's first inline block is the only place
  // __PDX_ME_DOC is set, and this and me-desk.js are the only two readers.
  // Nothing here sniffs location.pathname: /me, /me/ and a preview server's
  // /me.html are three spellings of one document that a path test gets
  // differently, and a second answer to "which document is this" is exactly the
  // kind of drift this pass exists to remove.
  function isMeDoc() {
    try { return !!window.__PDX_ME_DOC; } catch (e) { return false; }
  }

  var _toMe = false;
  function travelToMe() {
    if (isMeDoc()) return false;     // already home — there is nowhere to go
    if (_toMe) return false;         // the latch: one redirect per document
    _toMe = true;
    try { location.replace(ME); return true; } catch (e) {}
    try { location.href = ME; return true; } catch (e2) {}
    try { location.assign(ME); return true; } catch (e3) {}
    _toMe = false;                   // nothing worked — let a later gesture try
    return false;
  }

  // ── THE CLOCK ─────────────────────────────────────────────────────────────
  // Four marks, so "the phone cannot finish this form" is a number rather than
  // a feeling: when the panel opened, when the rows were first painted, and the
  // in/out edges of every set(). PDXPerf.mark is FIRST-WRITE-WINS, so each set()
  // mark carries its own issue key — otherwise every tap after the first
  // would be silently dropped onto tap one's timestamp and the waterfall would
  // report the panel as instant no matter how slow it was.
  //
  //   PDXPerf.between('yf-set-housing-in', 'yf-set-housing-out')
  //
  // is the cost of one tap, end to end, including the row flip.
  function mark(name) {
    try {
      var P = window.PDXPerf;
      if (P && typeof P.mark === 'function') P.mark(name);
    } catch (e) {}
  }

  // ── STORAGE ───────────────────────────────────────────────────────────────
  // KEY is the BASE key. The key actually read and written is per-account (see
  // activeKey below): "saved to the signed-in uid" has to be true on this device
  // and not only on the server, because two people share a browser. Without the
  // namespace, the pull reconciler would merge the previous account's answers
  // into the next one's snapshot and push them up under their name.
  var KEY = 'pdx_your_file_v1';     // the base localStorage key this file owns
  var COLLECTION = 'yourFile';      // PDXStore / pdx-sync collection name
  var VERSION = 1;

  // ── THE FLOOR, WHICH IS NOT THE LIST ──────────────────────────────────────
  // The slugs this file shipped asking for, kept for one job only: a shell where
  // ISSUE_MAP never parsed still has rows to paint and keys to save against.
  // They are SHIPPED ISSUE_MAP slugs, not the brief's (education_public is
  // public_schools here, education_choice is school_choice, taxes_lower is
  // lower_taxes) — see the header. On any shell that loaded the vocabulary these
  // slugs are already inside their families and this array contributes no row.
  var FLOOR = [
    'lands_preserve', 'housing', 'housing_build', 'gun_rights',
    'public_schools', 'school_choice', 'energy_production', 'lower_taxes'
  ];

  // ── THE LIST, DERIVED ─────────────────────────────────────────────────────
  // ONE SOURCE, PARSED. The rows are ISSUE_MAP's keys, in the order the
  // CORE_NATIONAL_ISSUES families list them, and the family is the group they
  // paint under. Nothing here is a literal count: the number the count sentence
  // prints is keys().length of whatever the vocabulary turned out to be.
  //
  // WHY IT IS LAZY AND MEMOIZED. issue-map.js is a separate script; at the
  // moment this IIFE runs, window.ISSUE_MAP may not exist yet (a deferred load,
  // an ordering change in a shell we do not own). A parse-time derivation would
  // therefore freeze an empty list into a module that never re-reads it. So
  // vocab() derives on first ask and only CACHES A DERIVED RESULT — a fallback
  // built from FLOOR alone is returned but not kept, so the very next ask after
  // ISSUE_MAP lands gets the real vocabulary.
  var _vocab = null;

  function coreFamilies() {
    try {
      var C = window.CORE_NATIONAL_ISSUES;
      return (C && C.length) ? C : null;
    } catch (e) { return null; }
  }

  function buildVocab() {
    var map = issueMap();
    var fams = coreFamilies();
    var list = [], groups = [], index = {}, seen = {};

    function group(key, label) { return { key: String(key), label: String(label), rows: [] }; }
    function push(g, key) {
      if (!key || seen[key]) return;
      seen[key] = 1;
      var def = map[key] || null;
      var row = {
        key: key,
        // `ask` is kept on every row because it was part of this module's shape
        // before the widening. It is the same slug now: there is one vocabulary.
        ask: key,
        fam: g.key,
        famLabel: g.label,
        label: (def && def.label) || key,
        chip: (def && def.chip) || ''
      };
      index[key] = row;
      list.push(row);
      g.rows.push(row);
    }

    if (fams) {
      for (var i = 0; i < fams.length; i++) {
        var f = fams[i] || {};
        var g = group(f.key || ('family_' + i), f.label || 'Issues');
        var ks = (f.keys && f.keys.length) ? f.keys : [];
        for (var j = 0; j < ks.length; j++) if (map[ks[j]]) push(g, ks[j]);
        if (g.rows.length) groups.push(g);
      }
      // A key ISSUE_MAP ships that no family claims is still part of the
      // vocabulary, so it still gets a row. The families partition the map
      // today; this is what keeps that from being load-bearing.
      var rest = group('other_issues', '🗂 Other issues');
      var all = Object.keys(map);
      for (var m = 0; m < all.length; m++) if (!seen[all[m]]) push(rest, all[m]);
      if (rest.rows.length) groups.push(rest);
    }

    // The floor, last, and only with whatever is still missing.
    var floor = group('your_file_floor', 'Issues');
    for (var n = 0; n < FLOOR.length; n++) push(floor, FLOOR[n]);
    if (floor.rows.length) groups.push(floor);

    return {
      list: list,
      keys: list.map(function (r) { return r.key; }),
      groups: groups,
      index: index,
      // True only when the app's vocabulary really was read. A floor-only list
      // is never cached under this flag.
      derived: !!(fams && list.length > FLOOR.length)
    };
  }

  function vocab() {
    if (_vocab && _vocab.derived) return _vocab;
    var v = buildVocab();
    if (v.derived) _vocab = v;
    return v;
  }
  function issuesList() { return vocab().list; }
  function keysList() { return vocab().keys; }
  // The membership test every read, write and projection goes through. It
  // replaced a literal lookup table for the same reason the list is derived:
  // there is no fixed set of keys to tabulate at parse time.
  function mine(k) { return !!(k && vocab().index[k]); }

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
    title: 'Your positions on the issues',
    line: 'Your positions. Used to compare formal records. Not a vote. Not a district poll.',
    signedIn: 'Saved to your account.',
    signedOut: 'Sign in to keep your file.',
    signIn: 'Sign in',
    close: 'Close your file',
    countOne: 'answer on file',
    countMany: 'answers on file',
    // Printed on a family's <summary>. The denominator is that family's own row
    // count, so a reader can see where their answers are without opening one.
    famSet: 'set'
  };

  var ID = 'pdx-your-file';
  var ID_TITLE = 'pdx-your-file-title';
  var ID_HEAD = 'pdx-your-file-head';
  var ID_BODY = 'pdx-your-file-scroll';
  // The count carries its own id for ONE reason: so the count sentence can be
  // updated on its own node. See patchRow() — an answer must not remount the
  // list it was given on.
  var ID_COUNT = 'pdx-your-file-count';

  function fn(x) { return typeof x === 'function'; }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function now() { return Date.now(); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // The fragment of a URL, or '' — used to read a hashchange's oldURL without
  // assuming URL() exists or that the value parses.
  function hashOf(url) {
    var s = String(url == null ? '' : url);
    var i = s.indexOf('#');
    return i === -1 ? '' : s.slice(i);
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

  // The identity signature this module repaints on: the member's uid, or '' for
  // nobody. Anonymous sessions collapse onto '' because user() already refuses
  // them, which is what makes the roster warm's signInAnonymously() a no-change
  // event rather than a repaint (see the onAuthStateChanged listener).
  function authSig() { var u = user(); return u ? String(u.uid || '') : ''; }
  var _authSig = null;

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

  // Normalizing is the defence on the way IN: a position that is not one of the
  // four is dropped rather than stored, and so is a key that is not shaped like
  // an issue slug at all.
  //
  // WHY THIS GATE IS SHAPE AND NOT MEMBERSHIP, now that the list is derived. The
  // vocabulary is read from a script this file does not control, so the list a
  // snapshot was authored against and the list this shell derived can differ by
  // a key — a newer deploy, a shell where ISSUE_MAP had not parsed, a family
  // added tomorrow. If normalize dropped by membership, the pull reconciler
  // below would then SAVE the truncation, and an answer the reader really gave
  // on their phone would be deleted by their laptop. Storage therefore keeps
  // what it is given; it is set(), position() and level() that refuse a key
  // outside the vocabulary, which is where the refusal actually matters —
  // nothing outside the list can be answered, read back, or projected.
  var SLUG = /^[a-z0-9][a-z0-9_]{0,63}$/;
  function normalize(raw) {
    var s = blank();
    if (!raw || typeof raw !== 'object') return s;
    var src = (raw.answers && typeof raw.answers === 'object') ? raw.answers : {};
    Object.keys(src).forEach(function (k) {
      if (!SLUG.test(String(k))) return;
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
        st.defineCollection(COLLECTION, { keys: [KEY], label: 'Your file — your positions on the issues' });
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
        // The union of both sides' keys, not this shell's list: see normalize.
        var union = {};
        Object.keys(local.answers).forEach(function (k) { union[k] = 1; });
        Object.keys(server.answers).forEach(function (k) { union[k] = 1; });
        Object.keys(union).forEach(function (k) {
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
  // Two accessors and nothing else. `position` is the raw answer for a key in
  // the vocabulary ('support' | 'oppose' | 'mixed' | 'unsure' | null). `level`
  // is the Alignment engine's own level for it, and it is null for 'unsure' and
  // for every key the vocabulary does not hold — which is the whole guarantee
  // that this file answers for the reader's issues and invents no others.
  function position(issueKey) {
    if (!mine(issueKey)) return null;
    var r = load().answers[issueKey];
    return (r && VALID[r.position]) ? r.position : null;
  }
  function level(issueKey) {
    var p = position(issueKey);
    return (p && LEVEL[p]) ? LEVEL[p] : null;
  }
  function answered() {
    var s = load();
    return keysList().filter(function (k) { return !!s.answers[k]; });
  }

  // ── PROJECTION INTO THE EXISTING ALIGNMENT SIGNATURE ──────────────────────
  // The engine only scores issues the reader has PICKED, and a dozen surfaces
  // gate their match readouts on that set being non-empty. So a sided answer
  // here adds its issue to that set through the tool's own public entry point —
  // no second selection store, and nothing invented: only the keys the reader
  // answered, and
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
  //
  // THE PAINT IS NOT ON THIS PATH, AND THAT IS THE WHOLE FIX. Every call site
  // below wraps the projection in the engine's paint hold (holdAlign), so the
  // selection state is applied synchronously — window._alignIssues and
  // window._alignIntensity are correct on the very next line, and no reader can
  // see a half-applied pick — while the repaint the engine would have run on
  // this frame is collapsed into the single pass it runs when the hold lifts.
  // Nothing is passed to the engine to arrange that: alignSetIntensity and
  // alignToggleIssue are called exactly as HEAD wrote them, with exactly the
  // arguments HEAD takes.
  //
  // THIS IS THE CEILING THE REPORT WAS HITTING. alignSetIntensity's eager tail
  // is _alignSave() + _alignRefreshAll() + _alignPulse(), and _alignRefreshAll
  // is sixteen document-wide repaints: _alignSyncAllChips, _alignUpdateStatus,
  // _alignRenderProfile, _alignUpdateFab, _alignSyncBrowseChips,
  // syncRelevantAlignmentUI, renderRelevantToMe, _mypolBuildGrid, chubFilter,
  // _potentialBuildGrid, filterDirectory, myteamBrowseFilter, _buildCmpTable,
  // _updateCmpFloat, renderKeyRaces, _pdxRaceSheetRefresh. Several of those
  // rebuild a whole grid, and their render paths are also what kick
  // _alignQueueConsistWarm → PDXVotingRecord.fetchCompare, so one tap on one of
  // these rows was rebuilding the homepage AND opening a vote-pack request.
  // Eight taps in a row were doing it eight times, behind the finger, which is
  // exactly the "cannot finish the form" in the report — and the form is now
  // the whole vocabulary, so the same defect at eight taps would be a far worse
  // one at forty.
  //
  // Held, a run of taps costs one refresh, after the last row has flipped.
  function projectOne(k, pos) {
    if (!mine(k)) return;
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
  //
  // ALWAYS HELD, and this is the cold-boot half of the same fix: a member who
  // has answered a dozen issues used to arrive on the homepage and spend a
  // dozen _alignRefreshAll passes before the first frame. The state is applied
  // once per answer, as it must be; the paint happens once, after the last one.
  function adopt() {
    var s = load();
    holdAlign(true);
    try {
      Object.keys(s.answers).forEach(function (k) {
        var r = s.answers[k];
        if (r && LEVEL[r.position]) projectOne(k, r.position);
      });
    } finally {
      holdAlign(false);
    }
  }

  // ── THE ONE MUTATION ──────────────────────────────────────────────────────
  // One answer per issue: setting a position REPLACES whatever was there. It
  // refuses a key outside the vocabulary, a position outside the four, and — the rule
  // the brief is explicit about — every write while signed out.
  //
  // WHAT A TAP IS ALLOWED TO DO, and this is the whole list: write one answer
  // into the store, apply that answer's side to the alignment signature, flip
  // the four buttons on the one row, and update the count sentence. Nothing
  // here paints a second surface, waits for the roster, or opens a request.
  //
  //   · PERSIST IS ASYNC ALREADY and stays off the critical path. save() writes
  //     localStorage and calls PDXStore.write → markDirty, whose only listener
  //     is the 1500 ms debounced auto-push. Nothing in that chain blocks.
  //   · THE PROJECTION IS HELD — state now, paint later. See projectOne. The
  //     hold is taken around the projection here as well as by open(), so a
  //     pick made with the panel closed costs one coalesced pass rather than
  //     sixteen synchronous repaints; with the panel open the counter simply
  //     goes to two and back, and nothing repaints until it closes.
  //   · NO ROSTER WAIT. signedIn() reads the session that already resolved; it
  //     never asks for one, and the directory index is not consulted at all.
  //   · pdx-your-file-change has no listeners in the app. It is kept because it
  //     is the documented seam for one, and dispatching to nobody is free.
  //
  // The row therefore flips in the same frame as the tap, and the marks below
  // prove it: yf-set-<key>-in to yf-set-<key>-out is the measured cost.
  function set(issueKey, pos) {
    if (!mine(issueKey) || !VALID[pos]) return false;
    if (!signedIn()) return false;
    var s = load();
    var prev = s.answers[issueKey];
    if (prev && prev.position === pos) return true;    // nothing moved
    mark('yf-set-' + issueKey + '-in');
    var ts = now();
    s.answers[issueKey] = { position: pos, updatedAt: ts };
    s.updatedAt = ts;
    save(s, true);
    holdAlign(true);
    try { projectOne(issueKey, pos); } finally { holdAlign(false); }
    _flash = issueKey;
    patchRow(issueKey);
    try {
      window.dispatchEvent(new CustomEvent('pdx-your-file-change', {
        detail: { issueKey: issueKey, position: pos }
      }));
    } catch (e) {}
    mark('yf-set-' + issueKey + '-out');
    return true;
  }

  // Take or release the alignment engine's paint hold. The counter lives in the
  // engine, so nesting is safe and no holder can release another's hold. An
  // absent engine — or an older copy of it without the hold — is a no-op, and
  // the engine then repaints eagerly, exactly as it did before this pass.
  function holdAlign(on) {
    try { if (fn(window.alignRefreshHold)) window.alignRefreshHold(!!on); } catch (e) {}
  }

  // ── THE PANEL ─────────────────────────────────────────────────────────────
  var _built = false;
  var _open = false;
  var _return = '';
  var _flash = null;
  var _adopted = false;

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
    try { body.addEventListener('click', bodyClick); } catch (e) {}

    _built = true;
    return overlay;
  }

  // ── THE ONE BODY DELEGATE, FOR BOTH PRESENTATIONS ─────────────────────────
  // The rows are the same rows in the panel and in region b of /me, so the
  // four controls on each of them are wired by the SAME listener rather than by a
  // copy of it per host. A second copy is a second chance for one presentation
  // to save an answer the other does not.
  function bodyClick(ev) {
    var t = ev && ev.target;
    if (!t || !t.closest) return;
    var b = t.closest('[data-pdxyf-set]');
    if (b) {
      var parts = String(b.getAttribute('data-pdxyf-set') || '').split('|');
      if (parts.length === 2) set(parts[0], parts[1]);
      return;
    }
    if (t.closest('[data-pdxyf-signin]')) signIn();
  }

  // ── THE SAME EDITOR, WITHOUT THE OVERLAY ──────────────────────────────────
  // /me's region b calls this with a host element and gets the editor of record
  // in it. NOT A SECOND RENDERER: it builds the same two nodes with the SAME
  // ids, which is the whole mechanism — render(), patchRow(), headHtml(),
  // bodyHtml(), countSentence() and set() all address the editor through
  // ID_HEAD / ID_BODY / ID_COUNT and none of them were touched by this pass.
  // So the rows, the four options on each, the account line, the count
  // sentence and the write path are identical in both presentations, and a fix
  // to any of them is a fix to both.
  //
  // THE HEAD IS THE REGION'S HEADING. me-desk.js deliberately ships no title
  // over this, so what a reader sees above the rows is this module's own
  // letterhead — including the line that has to stay on screen while they
  // answer ("Not a vote. Not a district poll.") and the count sentence, whose
  // single author stays countSentence().
  //
  // .pdxyf-body--inline is the one rule me-desk.css contributes to the editor:
  // .pdxyf-body is the single scroller inside a FIXED overlay and is bounded by
  // that overlay's height. There is no overlay here, so an inner scroller would
  // be a box that never scrolls inside a page that does. The modifier lets it
  // grow and the document scroller carries it.
  var _inline = null;
  function inline(host) {
    if (!host) return false;
    if (_inline && el(ID_HEAD) && el(ID_BODY)) { render(); return true; }
    var d;
    try { d = document; } catch (e) { return false; }
    if (!d || !fn(d.createElement)) return false;

    var head = d.createElement('div');
    head.id = ID_HEAD;
    head.className = 'pdxyf-head';
    var body = d.createElement('div');
    body.id = ID_BODY;
    body.className = 'pdxyf-body pdxyf-body--inline';

    try { host.innerHTML = ''; } catch (e) {}
    try { host.appendChild(head); host.appendChild(body); } catch (e2) { return false; }
    if (!el(ID_HEAD)) return false;

    try { body.addEventListener('click', bodyClick); } catch (e) {}
    _inline = host;
    // Projection runs on the first arrival whether or not anything is painted,
    // so this adopts for the same reason arrive() does: the alignment read must
    // have the reader's sides even on a document that never opens a panel.
    if (!_adopted) { _adopted = true; try { adopt(); } catch (e) {} }
    render();
    return true;
  }

  // Taking the reader TO the rows, on the document where the rows are the page.
  // The desk owns which region is which and how a region is landed on (its
  // ?tab= is a pushState, so Back returns to what they were reading), so this
  // asks it rather than holding a second copy of that knowledge. The fallback is
  // the editor's own head, which is inside region b by construction — so this
  // still lands correctly if the desk has not parsed yet.
  function reveal() {
    try {
      var D = window.PDXMeDesk;
      if (D && fn(D.goTab) && D.goTab('positions')) return true;
    } catch (e) {}
    try {
      var h = el(ID_HEAD);
      if (h && fn(h.scrollIntoView)) { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
    } catch (e2) {}
    return false;
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

  // One sentence, one place it is built, so the letterhead's first paint and
  // every later update cannot word it differently.
  //
  // THE DENOMINATOR IS THE LIST, MEASURED. It is keysList().length — the rows
  // this editor actually offers — and never a literal, which is the same rule
  // /me's own caption is held to. Add a key to ISSUE_MAP and both numbers move
  // together, because they are the same number read twice.
  function countSentence(n) {
    var total = keysList().length;
    return n + ' of ' + total + ' ' + (n === 1 ? COPY.countOne : COPY.countMany);
  }

  // How many of one family's rows hold an answer, and the sentence that prints
  // it. Same shape as the letterhead's, one scope down.
  function famCount(g, s) {
    var n = 0;
    for (var i = 0; i < g.rows.length; i++) if (s.answers[g.rows[i].key]) n++;
    return n;
  }
  function famSentence(n, total) { return n + ' of ' + total + ' ' + COPY.famSet; }

  function headHtml(n) {
    return '<p class="pdxyf-kick">' + esc(COPY.kick) + '</p>' +
      '<h2 class="pdxyf-title" id="' + ID_TITLE + '">' + esc(COPY.title) + '</h2>' +
      '<p class="pdxyf-line">' + esc(COPY.line) + '</p>' +
      '<p class="pdxyf-count" id="' + ID_COUNT + '">' + esc(countSentence(n)) + '</p>';
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
    // ONE COLLAPSED GROUP PER FAMILY. A flat list of the whole vocabulary is a
    // form nobody finishes, so the rows arrive grouped and closed, each summary
    // carrying its own "n of m set". A family holding an answer opens itself —
    // that is where the reader was working — and with nothing answered anywhere
    // the first family is open, so the editor never opens on a wall of summaries
    // with no visible row.
    var groups = vocab().groups;
    var anyAnswer = false;
    for (var a = 0; a < groups.length && !anyAnswer; a++) if (famCount(groups[a], s)) anyAnswer = true;
    var html = groups.map(function (g, i) {
      var n = famCount(g, s);
      var openIt = n > 0 || (!anyAnswer && i === 0);
      return '<details class="pdxyf-fam"' + (openIt ? ' open' : '') +
          ' data-pdxyf-fam="' + esc(g.key) + '">' +
        '<summary class="pdxyf-famsum">' +
          '<span class="pdxyf-famlb">' + esc(g.label) + '</span>' +
          '<span class="pdxyf-famn" data-pdxyf-famn="' + esc(g.key) + '">' +
            esc(famSentence(n, g.rows.length)) + '</span>' +
        '</summary>' +
        '<ul class="pdxyf-list">' +
          g.rows.map(function (r) { return rowHtml(r, s.answers[r.key], locked); }).join('') +
        '</ul>' +
      '</details>';
    }).join('');
    return acct + '<div class="pdxyf-fams">' + html + '</div>';
  }

  // ── WHOLESALE REPAINT ─────────────────────────────────────────────────────
  // For the changes that really do change every row: an account switch, a sign
  // in or out (which flips `disabled` on every control on the list), a snapshot
  // arriving from another device. An ANSWER is not one of these — see patchRow.
  //
  // It preserves the scroller's own offset across the swap, because replacing a
  // scroller's children empties it for one layout and the engine clamps
  // scrollTop to a range that is momentarily zero. Restoring it synchronously,
  // in the same task, means the reader's position was never painted anywhere
  // else.
  function render() {
    var head = el(ID_HEAD);
    var body = el(ID_BODY);
    if (!head && !body) return;
    var at = 0;
    try { at = (body && body.scrollTop) || 0; } catch (e) { at = 0; }
    var n = answered().length;
    if (head) { try { head.innerHTML = headHtml(n); } catch (e) {} }
    if (body) { try { body.innerHTML = bodyHtml(); } catch (e) {} }
    if (body && at > 0) { try { body.scrollTop = at; } catch (e) {} }
    // First paint of the rows. First-write-wins, so this is the FIRST
    // time the list existed in the document and later repaints do not move it.
    if (body) mark('yf-rows-painted');
    _flash = null;
  }

  // ── ONE ANSWER, IN PLACE ──────────────────────────────────────────────────
  // THE BUG THIS REPLACES. An answer called render(), which rewrote the whole
  // of .pdxyf-body's innerHTML. Three things fell out of that and all three were
  // in the report:
  //
  //   · THE SCROLL POSITION JUMPED. Every row leaves and every row arrives, so
  //     for one layout the scroller's content is empty and the engine clamps
  //     scrollTop to 0. Answer the seventh issue and you are returned to the
  //     first — which, on a phone, reads as the panel throwing you out. With the
  //     vocabulary in the list and its families open, that is a repaint of a
  //     hundred-odd rows, and the reader's place in them is unrecoverable.
  //   · THE NEXT SCROLL WAS STOLEN. The node under the finger is destroyed
  //     mid-gesture. A touch sequence that began on a button that no longer
  //     exists does not become a pan on its replacement; it is dropped, and the
  //     reader's next swipe does nothing at all.
  //   · IT WAS EVERY CONTROL ON THE LIST OF WORK FOR ONE BIT OF STATE, every tap, on the
  //     slowest device.
  //
  // So an answer now touches exactly what changed: the four controls on the one
  // row (their lit class and their aria-pressed), the row's one-frame flash, and
  // the count sentence on the letterhead. Nothing else is re-created, so there
  // is nothing for the scroller to clamp and nothing for the gesture to lose.
  // If the row is not on screen — an older shell, a panel that never built —
  // this falls back to render() rather than silently dropping the repaint.
  function patchRow(issueKey) {
    var body = el(ID_BODY);
    var row = null;
    try {
      row = body && body.querySelector
        ? body.querySelector('[data-pdxyf-row="' + String(issueKey).replace(/"/g, '') + '"]')
        : null;
    } catch (e) { row = null; }
    if (!row) { render(); return; }

    var mine = position(issueKey);
    var btns;
    try { btns = row.querySelectorAll('[data-pdxyf-set]'); } catch (e) { btns = null; }
    if (!btns || !btns.length) { render(); return; }

    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var parts = String(b.getAttribute('data-pdxyf-set') || '').split('|');
      var on = (parts.length === 2 && parts[1] === mine);
      try { b.classList[on ? 'add' : 'remove']('is-on'); } catch (e) {}
      try { b.setAttribute('aria-pressed', on ? 'true' : 'false'); } catch (e) {}
    }

    // The flash is one frame of accent on the row that just changed, and it is
    // removed on a timer rather than by the next repaint — there is no next
    // repaint now.
    try {
      row.classList.add('pdxyf-flash');
      setTimeout(function () { try { row.classList.remove('pdxyf-flash'); } catch (e) {} }, 700);
    } catch (e) {}

    // The letterhead's count, updated on its own node. Text, not a meter — see
    // the stylesheet's header.
    try {
      var c = el(ID_COUNT);
      if (c) c.textContent = countSentence(answered().length);
    } catch (e) {}

    // And the one family's own count, on its summary, for the same reason: the
    // group the reader is working inside must not have to be closed and
    // reopened to show that it moved.
    try {
      var det = row.closest ? row.closest('[data-pdxyf-fam]') : null;
      var gk = det ? String(det.getAttribute('data-pdxyf-fam') || '') : '';
      var node = det && det.querySelector ? det.querySelector('[data-pdxyf-famn]') : null;
      if (gk && node) {
        var gs = vocab().groups, g = null;
        for (var q = 0; q < gs.length; q++) if (gs[q].key === gk) g = gs[q];
        if (g) node.textContent = famSentence(famCount(g, load()), g.rows.length);
      }
    } catch (e) {}
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
    // THE TWO DOCUMENTS, DECIDED HERE AND NOWHERE ELSE.
    //
    // On /me there is no panel to open: region b already holds the rows,
    // so a click on "Your file" is a scroll, and true is returned because the
    // gesture WAS handled — wire()'s capturing listener reads that as "call
    // preventDefault", which is what stops the <a href="#your-file"> underneath
    // from putting a dead hash on the desk's own address.
    //
    // Anywhere else the hash is an address and this is a redirect. false is
    // returned on purpose even when the hop succeeded: the navigation is already
    // under way, and claiming the click would preventDefault a gesture whose
    // document is being replaced. If the hop is refused (an already-latched
    // redirect, a location that will not take a write) the overlay opens below
    // as it always did, so no reader is left with a control that does nothing.
    if (isMeDoc()) { mountReveal(); return true; }
    if (travelToMe()) return false;

    var overlay = build();
    if (!overlay) return false;
    mark('yf-open');
    var wasOpen = _open;
    _open = true;
    // THIS PANEL OWNS ONE PANEL. It does not rebuild Door 2 and it does not
    // rebuild the homepage — and while it is up, neither does anybody else on
    // its behalf: the hold parks _alignRefreshAll's sixteen repaints until the
    // panel closes, because every one of those surfaces is behind this overlay.
    // Picks made in between collapse into one pass on release (see hide()).
    //
    // ONE HOLD PER OPENING, taken only on the transition. open() is reachable
    // twice without a close in between — the hash lands and a control is tapped
    // — and a second hold with one release would park every repaint on the site
    // for the rest of the session.
    if (!wasOpen) holdAlign(true);
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
    if (_open) holdAlign(false);     // releases, and flushes one refresh if any pick landed
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
    // all land the same way: through arrive(), the SAME function the cold boot
    // below calls. There is deliberately no second open path — a cold visit that
    // opened by one route and an in-app hashchange that opened by another is how
    // this panel came to work from a click and not from a pasted URL.
    try {
      window.addEventListener('hashchange', function (ev) {
        // The address we were at before this one, taken from the event rather
        // than tracked in a variable, so close() can put the reader back where
        // they were even when the hash was set by a plain anchor this module
        // never saw a click for.
        var was = hashOf(ev && ev.oldURL);
        if (location.hash === HASH) {
          if (was && was !== HASH) _return = was;
          arrive();
        } else if (_open) hide();
      });
    } catch (e) {}
    try {
      window.addEventListener('popstate', function () {
        if (location.hash === HASH) arrive();
        else if (_open) hide();
      });
    } catch (e) {}
    // Signing in or out changes whether anything can be saved, so the panel has
    // to be repainted rather than left showing the previous session's state. The
    // answers are also re-projected: a member who answered on another device gets
    // their sides into the signature as soon as the pull lands.
    //
    // GUARDED ON THE UID, and that guard is the roster fix. firebase-boot's
    // roster warm calls auth.signInAnonymously() to read the directory index,
    // which fires onAuthStateChanged — so the "Loading the latest roster…"
    // background warm was remounting every row of an open panel, mid-tap,
    // to paint exactly the same thing (an anonymous session is not a member, so
    // `locked` does not change and no answer belongs to it). Comparing the uid
    // signature first means a session arriving that changes nothing repaints
    // nothing; a real sign-in, sign-out or account switch still repaints, which
    // is the case this listener exists for.
    try {
      _authSig = authSig();          // whatever is already resolved is not a change
      var a = (typeof auth !== 'undefined' && auth) ? auth : null;
      if (a && fn(a.onAuthStateChanged)) {
        a.onAuthStateChanged(function () {
          var sig = authSig();
          if (sig === _authSig) return;
          _authSig = sig;
          adopt();
          if (_open) render();       // closed panel has nothing to paint
        });
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
    // ARRAY-SHAPED, AND RE-READ ON EVERY ASK. Both are getters because the list
    // is derived from a script that may land after this one: a snapshot taken at
    // definition time would hand every consumer the floor forever. me-desk.js's
    // caption denominator is PDXYourFile.KEYS.length, so this is the one place
    // the "count against the vocabulary, not a literal" rule is kept.
    get ISSUES() { return issuesList(); },
    get KEYS() { return keysList(); },
    // The list as the editor paints it: one entry per family, with its rows.
    get GROUPS() { return vocab().groups; },
    // Membership, exposed so a consumer can ask rather than re-derive.
    offers: mine,
    POSITIONS: POSITIONS,
    LEVEL: LEVEL,
    COPY: COPY,
    open: open,
    close: close,
    isOpen: function () { return !!_open; },
    // The two halves of the address contract, exposed so the suite asserts them
    // directly instead of inferring them from source text.
    isMeDoc: isMeDoc,
    // Region b of /me: the same editor, painted into a host. Returns false on a
    // host it cannot use, so the desk can say so rather than paint an empty box.
    inline: inline,
    isInline: function () { return !!(_inline && el(ID_HEAD)); },
    set: set,
    // The two accessors the alignment read uses (see alignment-tool.js).
    position: position,
    level: level,
    answers: function () { return load().answers; },
    answered: answered,
    adopt: adopt,
    render: render,
    // The in-place update an answer takes. Exposed so the suite can assert that
    // a pick does not move the scroller, rather than inferring it from source.
    patchRow: patchRow,
    // Exposed for the suite: the painted body, asserted directly rather than
    // reconstructed from source text.
    bodyHtml: bodyHtml
  };

  wire();

  // ── ARRIVAL ───────────────────────────────────────────────────────────────
  // A cold visit to /#your-file opens the file, and it opens it AS SOON AS THIS
  // MODULE IS PARSED. This used to be a setTimeout(0) plus a 'load' listener,
  // and that is the bug this pass fixes: a macrotask runs AFTER every
  // DOMContentLoaded handler on the page, so on a 2 MB homepage full of them the
  // hash had to survive a queue of other people's arrival code before this file
  // ever looked at it — and a visit to /#your-file painted the homepage.
  //
  // IT WAITS FOR NOTHING. Not the roster, not auth, not the alignment engine,
  // not a snapshot pull, not the seat lookup. There is nothing to wait for:
  // signed out and with no stored answers at all this panel still has its rows
  // and four options each to print, so the honest arrival is the immediate one.
  // Everything that arrives later — a uid, a cross-device snapshot, the engine —
  // repaints the open panel through its own listener.
  //
  // Projection runs either way, so the alignment read has the reader's sides
  // without the panel ever being opened on this device.
  function arrive() {
    if (!_adopted) { _adopted = true; try { adopt(); } catch (e) {} }
    if (location.hash !== HASH) return false;
    // THE OTHER HALF OF THE REDIRECT CONTRACT, and it is the half that matters
    // for the links already out in the world: a bookmark, an old email, a
    // restored tab or a pasted /#your-file arrives HERE, not through a click.
    // On any document but /me it hops once and opens nothing. On /me it is not a
    // redirect at all — the hash is a region on this page, so it reveals it.
    if (isMeDoc()) { mountReveal(); return true; }
    if (travelToMe()) return false;
    if (_open) return true;
    try { return open(); } catch (e) { return false; }
  }

  // Reveal, and make sure there is something to reveal. A reader can land on
  // /me#your-file before me-desk.js has mounted region b — the hash is read at
  // parse time and the desk mounts on its own first paint — so this re-checks
  // the host it was given rather than assuming the rows are up.
  function mountReveal() {
    if (_inline && !el(ID_HEAD)) { try { inline(_inline); } catch (e) {} }
    return reveal();
  }
  (function boot() {
    // The tag is deferred and sits at the end of <body>, so document.body is
    // already parsed and this is the call that actually opens the panel.
    if (arrive()) return;
    // The three later beats, for the shells where it is not: a copy injected
    // into <head>, an older cached document, a browser that ran this before the
    // body existed. All four entry points are the SAME arrive(), and it is
    // idempotent, so landing more than once cannot open two panels.
    try { document.addEventListener('DOMContentLoaded', function () { arrive(); }); } catch (e) {}
    try { window.addEventListener('load', function () { arrive(); }); } catch (e) {}
    try { setTimeout(arrive, 0); } catch (e) {}
  })();
})();
