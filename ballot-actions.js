/* ============================================================================
   Your Ballot · Action Layer  (window.PDXActions)

   WHAT THIS IS
   ------------
   The deeper "do something about it" layer that sits beneath Your Ballot. Where
   Your Ballot helps you DECIDE, this helps you ACT — calmly, privately, one tap
   at a time:

     1. CONTACT YOUR REPS — a one-tap composer that pre-drafts an editable,
        respectful, nonpartisan message to a current officeholder that REFERENCES
        A SPECIFIC stance or promise of theirs (pulled from the same curated
        evidence the rest of the app uses). Send by email, call, or copy.
     2. DEADLINE REMINDERS — the voter deadlines that actually apply to your saved
        location (registration, mail-ballot, early voting, election day), each
        with a live countdown and a one-tap "Add to calendar" (.ics) so the
        reminder lives in YOUR calendar, not a server. Dismiss anything you don't
        want to see. Nothing is emailed unless you turn on the What-Changed email.
     3. PERSONAL IMPACT — "You've contacted N reps", surfaced from the private
        impact tracker (and this layer's own local contact log), so acting feels
        like it adds up.

   PRINCIPLES (identical to the rest of PolitiDex)
   -----------------------------------------------
   • LIGHTWEIGHT & ADDITIVE: one new section mounted as a sibling; nothing existing
     is modified. Reuses primitives that already exist:
       – window.PDXTeamView.representsMe(loc) / roster()  → who to contact
       – window._pdxBallotRecord(pid) + window._issueEvidenceMap(pid, rec)
                                                          → the stance/promise text
       – window.PDX_ELECTION_DATA + window._currentVoterLocation → the deadlines
       – window.PDXImpact.record('contacted', pid)        → personal impact
       – window.PDXStore (collection 'ballot_actions')    → private cross-device sync
   • OPT-IN & PRIVATE: the only thing stored is which deadline cards you dismissed
     and a private, on-device count of reps you've contacted (so we can show a ✓).
     It syncs only across your OWN signed-in devices via the same PDXStore path as
     your saved team, and never leaves your account. No message you write is ever
     sent anywhere by us — email/call open YOUR mail/phone app; copy uses YOUR
     clipboard.
   • NON-INTRUSIVE: pull-only. No pop-ups, no auto-open, dismissible, respects a
     small footprint. Mobile-first.
   ========================================================================== */
(function () {
  'use strict';
  if (window.PDXActions) return; // idempotent — never redefine

  var KEY = 'pdx_actions_v1';
  var COLLECTION = 'ballot_actions';
  var MOUNT_ID = 'pdx-actions';
  var OVERLAY_ID = 'pdx-act-overlay';
  var VERSION = 1;

  /* ── tiny helpers ─────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function now() { try { return Date.now(); } catch (e) { return 0; } }
  function fn(name) { return typeof window[name] === 'function' ? window[name] : null; }
  function store() { return window.PDXStore || null; }

  /* ── private state: dismissed deadlines + contacted-rep log ──────────────
     { version, updatedAt, dismissed:{ deadlineId:1 }, contacted:{ pid:{n,at} } } */
  function blank() { return { version: VERSION, updatedAt: 0, dismissed: {}, contacted: {} }; }
  function normalize(raw) {
    var s = blank();
    if (!raw || typeof raw !== 'object') return s;
    s.updatedAt = Math.max(0, parseInt(raw.updatedAt, 10) || 0);
    var d = (raw.dismissed && typeof raw.dismissed === 'object') ? raw.dismissed : {};
    for (var k in d) { if (Object.prototype.hasOwnProperty.call(d, k) && d[k]) s.dismissed[String(k)] = 1; }
    var c = (raw.contacted && typeof raw.contacted === 'object') ? raw.contacted : {};
    for (var pid in c) {
      if (!Object.prototype.hasOwnProperty.call(c, pid)) continue;
      var rec = c[pid] || {};
      var n = Math.max(0, parseInt(rec.n, 10) || 0);
      var at = Math.max(0, parseInt(rec.at, 10) || 0);
      if (n > 0) s.contacted[String(pid)] = { n: n, at: at };
    }
    return s;
  }
  function load() {
    var st = store();
    if (st && typeof st.read === 'function') return normalize(st.read(KEY, null));
    try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return blank(); }
  }
  function save(s, dirty) {
    s.updatedAt = now();
    var st = store();
    if (st && typeof st.write === 'function') st.write(KEY, s, { collection: COLLECTION, dirty: dirty !== false });
    else { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
    try { window.dispatchEvent(new CustomEvent('pdx-actions-change')); } catch (e) {}
    return s;
  }

  /* ── PDXStore sync wiring (mirrors the impact tracker's merge model) ──────
     Single user's own devices: UNION the dismissed set, and take the per-rep MAX
     contact count with the EARLIEST timestamp. All idempotent, never inflating,
     never losing a dismissal or a recorded contact. */
  function registerSync() {
    var st = store();
    if (!st) return;
    try {
      if (typeof st.defineCollection === 'function') st.defineCollection(COLLECTION, { keys: [KEY], label: 'Your ballot actions & reminders' });
      if (typeof st.registerSnapshot === 'function') st.registerSnapshot(COLLECTION, function () { return load(); });
      if (typeof st.registerReconciler === 'function') {
        st.registerReconciler(COLLECTION, function (serverSnap, meta) {
          if (!serverSnap || typeof serverSnap !== 'object') return { changed: false };
          var local = load(), server = normalize(serverSnap), merged = blank();
          var kk;
          for (kk in local.dismissed) merged.dismissed[kk] = 1;
          for (kk in server.dismissed) merged.dismissed[kk] = 1;
          var pid;
          function fold(src) {
            for (pid in src) {
              var r = src[pid], cur = merged.contacted[pid];
              if (!cur) merged.contacted[pid] = { n: r.n, at: r.at };
              else merged.contacted[pid] = { n: Math.max(cur.n, r.n), at: Math.min(cur.at || r.at, r.at || cur.at) };
            }
          }
          fold(local.contacted); fold(server.contacted);
          save(merged, !!(meta && meta.dirty));
          return { changed: true };
        });
      }
    } catch (e) { /* sync is best-effort; local-only still works */ }
  }

  function recordContact(pid, feedImpact) {
    var s = load();
    var cur = s.contacted[pid] || { n: 0, at: 0 };
    s.contacted[pid] = { n: cur.n + 1, at: cur.at || now() };
    save(s);
    // Feed the private impact tracker's "Reps contacted" metric (a no-op there
    // unless the tracker is opted on). Skipped for tel:/contact-form links, which
    // the impact tracker already counts via its own capture-phase click handler —
    // so those aren't double-counted.
    if (feedImpact !== false) {
      try { if (window.PDXImpact && typeof window.PDXImpact.record === 'function') window.PDXImpact.record('contacted', pid); } catch (e) {}
    }
  }
  function contactedCount() {
    // Prefer distinct reps from our own log; fall back to the impact metric.
    var n = Object.keys(load().contacted).length;
    if (n) return n;
    try {
      if (window.PDXImpact && typeof window.PDXImpact.stats === 'function') {
        var st = window.PDXImpact.stats();
        if (st && st.enabled) return st.counts.contacted || 0;
      }
    } catch (e) {}
    return 0;
  }

  /* ── who can I contact? current officeholders on my slate + tracked roster ─ */
  function polRec(pid) {
    try { if (fn('_pdxBallotRecord')) return window._pdxBallotRecord(pid) || null; } catch (e) {}
    try { if (window.CMP_DATA && window.CMP_DATA[pid]) return window.CMP_DATA[pid]; } catch (e) {}
    return null;
  }
  function photoFor(pid) { try { if (fn('_getPhotoUrl')) return window._getPhotoUrl(pid) || ''; } catch (e) {} return ''; }

  // Merge representsMe() (current officeholders for my seats) with my tracked
  // roster, de-duped by pid. representsMe entries carry the most useful office
  // label; roster entries fall back to the record. Only people we have a record
  // for are contactable (we need a name + something to reference).
  function contactableReps() {
    var out = [], seen = {};
    var loc = window._currentVoterLocation || null;
    var tv = window.PDXTeamView;
    function add(pid, label, office) {
      pid = String(pid || '').trim();
      if (!pid || seen[pid]) return;
      var rec = polRec(pid);
      if (!rec) return;
      seen[pid] = 1;
      out.push({
        pid: pid,
        name: rec.name || String(pid).replace(/_/g, ' '),
        office: office || rec.office || label || '',
        rec: rec
      });
    }
    try {
      if (tv && typeof tv.representsMe === 'function') {
        (tv.representsMe(loc) || []).forEach(function (r) { if (r && r.pid) add(r.pid, r.label, r.office || r.label); });
      }
    } catch (e) {}
    try {
      if (tv && typeof tv.roster === 'function') (tv.roster() || []).forEach(function (pid) { add(pid); });
    } catch (e) {}
    return out;
  }

  /* ── reference points: real stances / promises to write about ─────────────
     Distilled from _issueEvidenceMap so every draft is grounded in curated data,
     never fabricated. Ordering favours the most ACTIONABLE reference: a broken
     promise first (ask them to follow through), then a pending promise, then a
     documented stance. Each ref = { id, kind, topic, label, detail }. */
  function issueLabel(k) { try { if (fn('_issueLabel')) return window._issueLabel(k) || k; } catch (e) {} return k; }
  function refsFor(pid, rec) {
    var refs = [], map = {};
    try { if (fn('_issueEvidenceMap')) map = window._issueEvidenceMap(pid, rec) || {}; } catch (e) { map = {}; }
    var proms = [], stances = [];
    for (var ik in map) {
      if (!Object.prototype.hasOwnProperty.call(map, ik)) continue;
      var b = map[ik], topic = issueLabel(ik);
      (b.promises || []).forEach(function (pr) {
        var v = String(pr.verdict || '').toLowerCase();
        proms.push({
          id: 'p:' + ik + ':' + String(pr.title || '').slice(0, 24),
          kind: v === 'broken' ? 'promise-broken' : (v === 'kept' ? 'promise-kept' : 'promise-pending'),
          rank: v === 'broken' ? 0 : (v === 'pending' || !v ? 1 : 3),
          topic: topic, label: pr.title || topic, detail: pr.detail || ''
        });
      });
      if (b.position && b.position.text) {
        stances.push({
          id: 's:' + ik, kind: 'stance', rank: 2,
          topic: topic, label: topic, detail: b.position.text
        });
      }
    }
    refs = proms.concat(stances);
    refs.sort(function (a, b2) { return a.rank - b2.rank; });
    // Always give the user a generic option so the composer is never empty.
    refs.push({ id: 'general', kind: 'general', rank: 9, topic: '', label: 'A general message', detail: '' });
    return refs.slice(0, 7);
  }

  // Build a respectful, nonpartisan draft that references the chosen point.
  function draftFor(rep, ref) {
    var name = rep.name;
    var greetName = name;
    // Prefer "Rep./Sen./Gov. Lastname" when the office makes it obvious.
    var office = (rep.office || '').toLowerCase();
    var last = name.split(/\s+/).slice(-1)[0] || name;
    if (/senat/.test(office)) greetName = 'Senator ' + last;
    else if (/house|represent|congress/.test(office)) greetName = 'Representative ' + last;
    else if (/governor/.test(office)) greetName = 'Governor ' + last;

    var opening = 'Dear ' + greetName + ',\n\nI\'m a constituent and I\'m writing to share what matters to me and to hear where you stand.';
    var mid;
    if (ref.kind === 'promise-broken') {
      mid = '\n\nI\'ve been following your record on ' + ref.topic + ', including this commitment:\n  • "' + ref.label + '"\n\n' +
        'From what I can find, this promise has not yet been kept. I\'d appreciate an update on where it stands and what you\'re doing to follow through.';
    } else if (ref.kind === 'promise-pending') {
      mid = '\n\nI\'m following your commitment on ' + ref.topic + ':\n  • "' + ref.label + '"\n\n' +
        'I understand this is still in progress. Could you share the current status and the next steps you plan to take?';
    } else if (ref.kind === 'promise-kept') {
      mid = '\n\nI wanted to acknowledge your work on ' + ref.topic + ', including keeping this commitment:\n  • "' + ref.label + '"\n\n' +
        'Thank you for following through. I\'d like to know how you plan to build on it.';
    } else if (ref.kind === 'stance') {
      mid = '\n\nI\'m writing about your position on ' + ref.topic + '. As I understand it:\n  • ' + ref.detail + '\n\n' +
        'I\'d value hearing more about your current thinking and the specific actions you\'re taking on this issue.';
    } else {
      mid = '\n\nAs one of the people you represent, I care about how decisions get made and followed through on. I\'d appreciate knowing your current priorities and how I can stay informed about your work.';
    }
    var close = '\n\nThank you for your time and for your service.\n\nSincerely,\n[Your name]\n[Your address — so they can verify you\'re a constituent]';
    return opening + mid + close;
  }
  function subjectFor(rep, ref) {
    if (ref.kind === 'general') return 'A message from a constituent';
    return 'Constituent message about ' + (ref.topic || ref.label);
  }

  /* ── contact routing (email / phone / official lookup) ────────────────────
     PolitiDex doesn't bundle personal contact details for every official, so this
     resolves the best available route. An optional window.PDX_REP_CONTACTS map
     ({ pid: { email, phone, contactUrl, officeName } }) lights up direct email/
     phone with ZERO code changes as that data is added. Absent that, we always
     provide the correct OFFICIAL directory to look them up, so the action never
     dead-ends. */
  function officialLookup(rep) {
    var office = (rep.office || '').toLowerCase();
    var rec = rep.rec || {};
    var level = String(rec.level || '').toLowerCase();
    if (/senat/.test(office) && (/u\.s\.|us |federal|senate/.test(office) || level === 'federal')) {
      return { label: 'senate.gov directory', url: 'https://www.senate.gov/senators/senators-contact.htm' };
    }
    if (/house|represent|congress/.test(office) && (/u\.s\.|us |federal/.test(office) || level === 'federal')) {
      return { label: 'house.gov · find your rep', url: 'https://www.house.gov/representatives/find-your-representative' };
    }
    // State / local: prefer the state's own election portal from the calendar data.
    var st = (window._currentVoterLocation && window._currentVoterLocation.state) || (rec.state || '');
    try {
      var links = (window.PDX_ELECTION_DATA && window.PDX_ELECTION_DATA.links) || {};
      if (st && links[st] && links[st].url) return { label: links[st].label || (st + ' officials'), url: links[st].url };
    } catch (e) {}
    return { label: 'Look up officials · usa.gov', url: 'https://www.usa.gov/elected-officials' };
  }
  function resolveContact(rep) {
    var direct = {};
    try {
      var m = window.PDX_REP_CONTACTS || {};
      if (m[rep.pid] && typeof m[rep.pid] === 'object') direct = m[rep.pid];
    } catch (e) {}
    return {
      email: (typeof direct.email === 'string' && direct.email) ? direct.email : '',
      phone: (typeof direct.phone === 'string' && direct.phone) ? direct.phone : '',
      contactUrl: (typeof direct.contactUrl === 'string' && direct.contactUrl) ? direct.contactUrl : '',
      lookup: officialLookup(rep)
    };
  }

  /* ── the contact composer drawer ──────────────────────────────────────── */
  var _lastFocus = null;
  var _composer = null; // { rep, refs, ref }

  function ensureOverlay() {
    var o = document.getElementById(OVERLAY_ID);
    if (o) return o;
    o = document.createElement('div');
    o.id = OVERLAY_ID;
    o.className = 'pdx-act-overlay';
    o.setAttribute('hidden', '');
    (document.body || document.documentElement).appendChild(o);
    return o;
  }

  function renderComposer() {
    var o = ensureOverlay();
    var rep = _composer.rep, refs = _composer.refs, ref = _composer.ref;
    var photoUrl = photoFor(rep.pid);
    var photo = photoUrl
      ? '<span class="pdx-act-sheet-photo" style="background-image:url(&quot;' + esc(photoUrl) + '&quot;)"></span>'
      : '<span class="pdx-act-sheet-photo">🏛️</span>';
    var chips = refs.map(function (r) {
      var lbl = r.kind === 'promise-broken' ? '⚠️ ' + r.topic
        : r.kind === 'promise-pending' ? '⏳ ' + r.topic
        : r.kind === 'promise-kept' ? '✅ ' + r.topic
        : r.kind === 'stance' ? '🎯 ' + r.topic
        : '✉️ General';
      return '<button type="button" class="pdx-act-ref-chip' + (r.id === ref.id ? ' is-on' : '') + '" data-act-ref="' + esc(r.id) + '">' + esc(lbl) + '</button>';
    }).join('');

    var draft = draftFor(rep, ref);
    var subject = subjectFor(rep, ref);
    var contact = resolveContact(rep);

    var sendRow = '';
    sendRow += '<button type="button" class="pdx-act-btn pdx-act-btn--gold" data-act-send="email">✉️ ' + (contact.email ? 'Email' : 'Open email') + '</button>';
    if (contact.phone) sendRow += '<a class="pdx-act-btn" data-pdx-contact href="tel:' + esc(contact.phone.replace(/[^0-9+]/g, '')) + '">📞 Call</a>';
    sendRow += '<button type="button" class="pdx-act-btn" data-act-send="copy">📋 Copy</button>';

    var routeNote = contact.email
      ? 'Sending to <b>' + esc(contact.email) + '</b>.'
      : (contact.contactUrl
          ? 'We don\'t have a direct email on file — <b>Open email</b> starts a draft you can address, or <a href="' + esc(contact.contactUrl) + '" target="_blank" rel="noopener" data-pdx-contact>use their contact form ↗</a>.'
          : 'We don\'t have a direct email on file — <b>Open email</b> starts a draft, or <a href="' + esc(contact.lookup.url) + '" target="_blank" rel="noopener" data-pdx-contact>find their office via ' + esc(contact.lookup.label) + ' ↗</a> and paste your message.');

    o.innerHTML =
      '<div class="pdx-act-sheet" role="dialog" aria-modal="true" aria-label="Contact ' + esc(rep.name) + '">' +
        '<div class="pdx-act-sheet-head">' + photo +
          '<div class="pdx-act-sheet-titles">' +
            '<div class="pdx-act-sheet-eyebrow">✊ Contact your rep</div>' +
            '<div class="pdx-act-sheet-name">' + esc(rep.name) + '</div>' +
            (rep.office ? '<div class="pdx-act-sheet-office">' + esc(rep.office) + '</div>' : '') +
          '</div>' +
          '<button type="button" class="pdx-act-x" data-act-close="1" aria-label="Close">✕</button>' +
        '</div>' +
        (refs.length > 1 ? '<div class="pdx-act-sect">What to write about</div><div class="pdx-act-refs">' + chips + '</div>' : '') +
        '<div class="pdx-act-sect">Your message · edit freely before sending</div>' +
        '<div class="pdx-act-field">' +
          '<input type="text" class="pdx-act-input" id="pdx-act-subject" aria-label="Subject" value="' + esc(subject) + '">' +
          '<textarea class="pdx-act-textarea" id="pdx-act-message" aria-label="Message">' + esc(draft) + '</textarea>' +
        '</div>' +
        '<div class="pdx-act-sheet-actions">' + sendRow + '</div>' +
        '<p class="pdx-act-sheet-note">' + routeNote + ' Nothing is sent by PolitiDex — this opens your own email or phone. Be respectful and factual; you\'re writing as yourself.</p>' +
      '</div>';
  }

  function openComposer(pid) {
    var rec = polRec(pid);
    if (!rec) { toast('No record on file for this official yet.'); return; }
    var rep = { pid: pid, name: rec.name || String(pid).replace(/_/g, ' '), office: rec.office || '', rec: rec };
    var refs = refsFor(pid, rec);
    _composer = { rep: rep, refs: refs, ref: refs[0] };
    var o = ensureOverlay();
    _lastFocus = document.activeElement;
    renderComposer();
    o.removeAttribute('hidden');
    try { window.requestAnimationFrame(function () { o.classList.add('is-open'); }); } catch (e) { o.classList.add('is-open'); }
    document.documentElement.classList.add('pdx-act-modal-open');
    var x = o.querySelector('[data-act-close]');
    if (x && x.focus) { try { x.focus(); } catch (e) {} }
  }
  function closeComposer() {
    var o = document.getElementById(OVERLAY_ID);
    document.documentElement.classList.remove('pdx-act-modal-open');
    _composer = null;
    if (!o) return;
    o.classList.remove('is-open');
    o.setAttribute('hidden', '');
    if (_lastFocus && _lastFocus.focus) { try { _lastFocus.focus(); } catch (e) {} }
  }

  // Read the (possibly edited) subject + body straight from the DOM so user edits
  // are always honoured.
  function currentDraft() {
    var subEl = document.getElementById('pdx-act-subject');
    var msgEl = document.getElementById('pdx-act-message');
    return {
      subject: subEl ? subEl.value : subjectFor(_composer.rep, _composer.ref),
      body: msgEl ? msgEl.value : draftFor(_composer.rep, _composer.ref)
    };
  }
  function doSend(mode) {
    if (!_composer) return;
    var rep = _composer.rep;
    var d = currentDraft();
    var contact = resolveContact(rep);
    if (mode === 'email') {
      var to = contact.email || '';
      var href = 'mailto:' + encodeURIComponent(to) +
        '?subject=' + encodeURIComponent(d.subject) +
        '&body=' + encodeURIComponent(d.body);
      recordContact(rep.pid);
      try { window.location.href = href; } catch (e) {}
      toast(contact.email ? ('Opening an email to ' + rep.name + '…') : 'Opening your email app — add their address to send.');
      closeComposer();
    } else if (mode === 'copy') {
      copyText(d.subject + '\n\n' + d.body).then(function (ok) {
        if (ok) recordContact(rep.pid);
        toast(ok ? 'Message copied — paste it into email, a contact form, or a letter.' : 'Couldn\'t copy automatically — select the text to copy it.');
      });
    }
  }
  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    } catch (e) {}
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve(!!ok);
    } catch (e) { return Promise.resolve(false); }
  }
  function toast(msg) { try { if (fn('_pdxToast')) window._pdxToast(msg); } catch (e) {} }

  /* ── deadlines (location-based reminders) ─────────────────────────────────
     Reads the SAME curated calendar the Election Calendar section uses, filtered
     to the voter's saved state. Only upcoming (or currently-open) dates show, so
     the panel is always forward-looking. Everything is client-side. */
  function currentState() {
    if (!window._hasUserLocation) return '';
    var loc = window._currentVoterLocation || {};
    return (loc.state || '').trim();
  }
  function upcomingDeadlines() {
    var DATA = window.PDX_ELECTION_DATA;
    if (!DATA) return [];
    var st = currentState();
    var events = (DATA.national || []).concat(
      (st && st !== 'National' && DATA.states && DATA.states[st]) ? DATA.states[st] : []
    );
    var t = now();
    var dismissed = load().dismissed;
    return events
      .map(function (e) {
        var start = new Date(e.date).getTime();
        var end = new Date(e.end || e.date).getTime();
        return { e: e, start: start, end: end };
      })
      .filter(function (x) { return isFinite(x.end) && x.end >= t && !dismissed[x.e.id]; })
      .sort(function (a, b) { return a.start - b.start; });
  }
  function daysUntil(ms) { return Math.max(0, Math.ceil((ms - now()) / 86400000)); }
  function fmtDate(ms) {
    try { return new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return ''; }
  }

  // Build and download an .ics calendar file for a deadline, so the reminder
  // lives in the user's OWN calendar (private, offline, no server, no account).
  function icsDate(ms) {
    var d = new Date(ms);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' +
      p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  }
  function fold(line) { return String(line).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }
  function downloadICS(ev) {
    var startMs = new Date(ev.date).getTime();
    var endMs = new Date(ev.end || ev.date).getTime();
    if (ev.kind === 'deadline') endMs = startMs + 30 * 60000; // point-in-time deadline
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PolitiDex//Ballot Actions//EN',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:politidex-' + fold(ev.id) + '-' + startMs + '@politidex.org',
      'DTSTAMP:' + icsDate(now()),
      'DTSTART:' + icsDate(startMs),
      'DTEND:' + icsDate(endMs),
      'SUMMARY:' + fold('🗳️ ' + ev.title + (ev.tag ? ' (' + ev.tag + ')' : '')),
      'DESCRIPTION:' + fold((ev.sub || '') + (ev.cta && ev.cta.href ? '\n\n' + ev.cta.label + ': ' + ev.cta.href : '') + '\n\nReminder added from PolitiDex.'),
      // A gentle heads-up the day before.
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + fold(ev.title), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'politidex-' + String(ev.id).replace(/[^a-z0-9\-]/gi, '') + '.ics';
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 200);
    toast('Reminder for "' + ev.title + '" saved to your calendar.');
    try { if (window.PDXImpact && window.PDXImpact.record) window.PDXImpact.record('reviewed', 'deadline:' + ev.id); } catch (e) {}
  }
  function dismissDeadline(id) {
    var s = load();
    s.dismissed[String(id)] = 1;
    save(s);
  }

  /* ── the Take Action panel ───────────────────────────────────────────────*/
  function anchorInsert(node) {
    // Sit AFTER the impact widget (which forcibly re-homes itself to directly
    // follow #your-ballot). Anchoring after it keeps both panels stable instead
    // of the two polling loops fighting over the same slot.
    var imp = document.getElementById('pdx-impact');
    if (imp && imp.parentNode) { imp.parentNode.insertBefore(node, imp.nextSibling); return true; }
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
    node.setAttribute('aria-label', 'Take action on your ballot');
    if (!anchorInsert(node)) return null;
    return node;
  }

  function repRow(rep) {
    var photoUrl = photoFor(rep.pid);
    var photo = photoUrl
      ? '<span class="pdx-act-rep-photo" style="background-image:url(&quot;' + esc(photoUrl) + '&quot;)"></span>'
      : '<span class="pdx-act-rep-photo">🏛️</span>';
    var refs = refsFor(rep.pid, rep.rec);
    var top = refs[0];
    var refLine = (top && top.kind !== 'general')
      ? '<div class="pdx-act-rep-ref"><span class="pdx-act-refdot">•</span> ' +
          (top.kind === 'promise-broken' ? 'Ask about an unkept promise · ' : top.kind === 'promise-pending' ? 'Follow up on a pending promise · ' : top.kind === 'stance' ? 'Weigh in on their stance · ' : '') +
          esc(top.topic || top.label) + '</div>'
      : '';
    var contactedN = (load().contacted[rep.pid] || {}).n || 0;
    var badge = contactedN ? '<span class="pdx-act-contacted">✓ Contacted</span>' : '';
    return '<div class="pdx-act-rep">' + photo +
        '<div class="pdx-act-rep-body">' +
          '<div class="pdx-act-rep-name">' + esc(rep.name) + '</div>' +
          (rep.office ? '<div class="pdx-act-rep-office">' + esc(rep.office) + '</div>' : '') +
          refLine +
        '</div>' +
        '<div class="pdx-act-rep-actions">' + badge +
          '<button type="button" class="pdx-act-btn pdx-act-btn--sm pdx-act-btn--green" data-act-contact="' + esc(rep.pid) + '">✉️ Contact</button>' +
        '</div>' +
      '</div>';
  }

  function deadlineCard(x) {
    var e = x.e;
    var color = e.kind === 'deadline' ? '#ef4444' : (e.kind === 'window' ? '#34d399' : '#fad96a');
    var open = x.start <= now() && x.end >= now();
    var d = daysUntil(x.start);
    var countHtml = open
      ? '<span class="pdx-act-dl-count soon">Open now</span>'
      : '<span class="pdx-act-dl-count' + (d <= 7 ? ' soon' : '') + '">' + (d === 0 ? 'Today' : 'in ' + d + ' day' + (d === 1 ? '' : 's')) + '</span>';
    var cta = (e.cta && e.cta.href)
      ? '<a class="pdx-act-btn pdx-act-btn--sm" href="' + esc(e.cta.href) + '" target="_blank" rel="noopener">' + esc(e.cta.label) + ' ↗</a>'
      : '';
    return '<div class="pdx-act-dl" style="--dlc:' + color + '">' +
        '<button type="button" class="pdx-act-dl-x" data-act-dismiss="' + esc(e.id) + '" aria-label="Dismiss this reminder">✕</button>' +
        '<span class="pdx-act-dl-ico">' + (e.icon || '📅') + '</span>' +
        '<div class="pdx-act-dl-body">' +
          '<div class="pdx-act-dl-tag">' + esc(e.tag || e.kind) + '</div>' +
          '<div class="pdx-act-dl-title">' + esc(e.title) + '</div>' +
          '<div class="pdx-act-dl-when">' + countHtml + ' · ' + fmtDate(x.start) + '</div>' +
          '<div class="pdx-act-dl-actions">' +
            '<button type="button" class="pdx-act-btn pdx-act-btn--sm pdx-act-btn--gold" data-act-ics="' + esc(e.id) + '">＋ Add to calendar</button>' +
            cta +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function render() {
    var node = ensureMount();
    if (!node) return;

    var reps = contactableReps();
    var deadlines = upcomingDeadlines();
    var located = !!window._hasUserLocation;

    // Nothing to act on yet → a calm prompt (only when there's genuinely nothing).
    if (!reps.length && !deadlines.length) {
      node.innerHTML =
        '<div class="pdx-act-card">' +
          '<div class="pdx-act-head">' +
            '<div class="pdx-act-ico" aria-hidden="true">✊</div>' +
            '<div class="pdx-act-titles">' +
              '<div class="pdx-act-eyebrow">Take action</div>' +
              '<div class="pdx-act-h">Turn your ballot into <b>action</b></div>' +
              '<div class="pdx-act-sub">' + (located
                ? 'Once candidates and officials load for your area, you\'ll be able to contact your reps and get your voting deadlines here.'
                : 'Set your address on Your Ballot and this fills with your current officials to contact and the voting deadlines that apply to you.') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      return;
    }

    var contactedN = contactedCount();
    var impactHtml = contactedN > 0
      ? '<div class="pdx-act-impact" aria-label="You have contacted ' + contactedN + ' representatives"><b>' + contactedN + '</b>rep' + (contactedN === 1 ? '' : 's') + ' contacted</div>'
      : '';

    var head =
      '<div class="pdx-act-head">' +
        '<div class="pdx-act-ico" aria-hidden="true">✊</div>' +
        '<div class="pdx-act-titles">' +
          '<div class="pdx-act-eyebrow">Take action</div>' +
          '<div class="pdx-act-h">Your ballot, <b>into action</b></div>' +
          '<div class="pdx-act-sub">Reach the people who represent you — with a message grounded in their real record — and keep your voting deadlines close.</div>' +
        '</div>' + impactHtml +
      '</div>';

    var groups = '';
    if (deadlines.length) {
      var cards = deadlines.slice(0, 4).map(deadlineCard).join('');
      groups += '<div class="pdx-act-group">' +
        '<div class="pdx-act-group-h">🗓️ Your voting deadlines' +
          (currentState() && currentState() !== 'National' ? '<span class="pdx-act-hint">' + esc(currentState()) + '</span>' : '<span class="pdx-act-hint">Set your state for local dates</span>') +
        '</div>' +
        '<div class="pdx-act-deadlines">' + cards + '</div>' +
      '</div>';
    }
    if (reps.length) {
      var rows = reps.slice(0, 8).map(repRow).join('');
      groups += '<div class="pdx-act-group">' +
        '<div class="pdx-act-group-h">✉️ Contact your representatives<span class="pdx-act-hint">Pre-drafted · you edit &amp; send</span></div>' +
        '<div class="pdx-act-reps">' + rows + '</div>' +
      '</div>';
    }

    var note = '<div class="pdx-act-note">🔒 Private to you and nonpartisan by design. PolitiDex never sends anything on your behalf — messages open in your own email or phone, and reminders save to your own calendar. Your contact history syncs only across your signed-in devices.</div>';

    node.innerHTML = '<div class="pdx-act-card">' + head + groups + note + '</div>';
  }

  /* ── delegated interactions ─────────────────────────────────────────────── */
  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    // A tel: link or contact-form link inside the composer is a real "contacted"
    // action — update our own log (for the ✓ badge) but leave the impact metric to
    // the tracker's capture handler, and let the link do its normal thing.
    if (_composer) {
      var routeLink = t.closest('a[href^="tel:"], [data-pdx-contact]');
      if (routeLink && document.getElementById(OVERLAY_ID) && document.getElementById(OVERLAY_ID).contains(routeLink)) {
        recordContact(_composer.rep.pid, false);
      }
    }

    // Composer ref switch (regenerate the draft to reference the new point).
    var refBtn = t.closest('[data-act-ref]');
    if (refBtn && _composer) {
      var id = refBtn.getAttribute('data-act-ref');
      var found = null;
      _composer.refs.forEach(function (r) { if (r.id === id) found = r; });
      if (found) { _composer.ref = found; renderComposer(); }
      return;
    }
    var closeBtn = t.closest('[data-act-close]');
    if (closeBtn) { e.preventDefault(); closeComposer(); return; }
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay && t === overlay) { closeComposer(); return; } // backdrop
    var sendBtn = t.closest('[data-act-send]');
    if (sendBtn) { e.preventDefault(); doSend(sendBtn.getAttribute('data-act-send')); return; }

    // Panel controls.
    var contactBtn = t.closest('[data-act-contact], [data-pdx-contact-rep]');
    if (contactBtn) {
      e.preventDefault();
      openComposer(contactBtn.getAttribute('data-act-contact') || contactBtn.getAttribute('data-pdx-contact-rep'));
      return;
    }
    var icsBtn = t.closest('[data-act-ics]');
    if (icsBtn) {
      e.preventDefault();
      var eid = icsBtn.getAttribute('data-act-ics');
      var ev = null;
      upcomingDeadlines().forEach(function (x) { if (x.e.id === eid) ev = x.e; });
      if (ev) downloadICS(ev);
      return;
    }
    var dismissBtn = t.closest('[data-act-dismiss]');
    if (dismissBtn) { e.preventDefault(); dismissDeadline(dismissBtn.getAttribute('data-act-dismiss')); render(); return; }
  }
  function onKeydown(e) { if ((e.key === 'Escape' || e.key === 'Esc') && _composer) closeComposer(); }

  /* ── public API ──────────────────────────────────────────────────────────*/
  window.PDXActions = {
    KEY: KEY, COLLECTION: COLLECTION,
    render: render,
    contact: openComposer,           // window.PDXActions.contact(pid) from anywhere
    closeContact: closeComposer,
    contactedCount: contactedCount,
    addDeadlineToCalendar: function (id) { var ev = null; upcomingDeadlines().forEach(function (x) { if (x.e.id === id) ev = x.e; }); if (ev) downloadICS(ev); }
  };

  /* ── boot ──────────────────────────────────────────────────────────────── */
  function boot() {
    registerSync();
    render();
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeydown);
    // Re-render on the signals that change what's actionable.
    window.addEventListener('pdx-actions-change', render);
    window.addEventListener('pdx-team-change', render);
    // The app re-runs its location reaction when the address changes; chain on it.
    var _orig = window._triggerLocationReaction;
    window._triggerLocationReaction = function () {
      var r; if (_orig) { try { r = _orig.apply(this, arguments); } catch (e) {} }
      try { render(); } catch (e) {}
      return r;
    };
    // Data (CMP_DATA / TEAM_POSITIONS / election data) settles after Firestore.
    // Poll briefly so the panel fills in the moment it's ready, then stop.
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      // Keep the panel homed just after the impact widget if both exist.
      var node = document.getElementById(MOUNT_ID), imp = document.getElementById('pdx-impact');
      if (node && imp && node.previousElementSibling !== imp && imp.parentNode) imp.parentNode.insertBefore(node, imp.nextSibling);
      render();
      if (tries > 12) clearInterval(iv);
    }, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
