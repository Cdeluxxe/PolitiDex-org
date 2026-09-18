/* ═══════════════════════════════════════════════════════════════════════════
   door2-first-run.js — set one stance, then use the desk
   ────────────────────────────────────────────────────────────────────────────
   WHY THIS FILE EXISTS

   The ballot workspace can already match a voter's own positions against the
   formal record of whoever holds their seats. An ordinary voter who lands on
   /ballot never finds that out, because the match has an input they have not
   given yet — their own stance on an issue — and the only place to give it was
   a 121-key dropdown that reads like a survey.

   So this module is a COACH, not a feature. It runs one loop, in one beat at a
   time, and everything it touches already exists:

     SCREEN A — "What do you care about first?"
       Twelve starter chips, real ISSUE_MAP keys, the same per-issue colours the
       rest of the site uses. A typeahead under them over label + scope sentence
       for anything not on the twelve, five hits max. One tap. No multi-select:
       a voter who has not done this once does not need to be asked for a set.

     SCREEN B — that one issue, nothing else.
       The LOCKED SCOPE SENTENCE from issue-scope.js (never a paraphrase written
       here), then Support / Oppose / Not sure. Support and Oppose write the same
       store the Team Builder and this workspace already read. "Not sure" writes
       NOTHING — see the note on the store below.

     SCREEN C — the desk, for the seat that is open.
       The holder's FORMAL PATTERN ON THAT ISSUE first, from
       PDXConsistency.formalPatternIndex.rowFor(pid, key) — one read, of one
       issue, for one person. Their stated word goes UNDER it, as a label, not a
       verdict. The pick control the workspace already paints stays where it is;
       this card sits above it and does not reimplement it.

   THE STORE IS THE EXISTING STORE

   my-stances.js is not loaded on /ballot (the shell test forbids it, and
   forbids stubbing PDXStances there, because a fake count would let the record
   lane believe a reader has positions they never set). But the store has two
   ends of one lineage:

     PDXStances.setStance()  →  projectOne()  →  window.alignSetIntensity()
     PDXStances.reconcileWithAlignment()  ←  adopts alignment-only keys

   alignment-tool.js IS loaded here. So writing through alignSetIntensity() on
   this document puts the key in the same place PDXStances.set() would have put
   it, and the next document that loads my-stances.js adopts it as a real
   stance. One issue answered is one key in the existing store on both paths —
   and when PDXStances happens to be present (a future shell, a test harness),
   this calls it directly and lets it project. There is no second store here.

   WHAT "NOT SURE" MEANS

   The store's vocabulary is support / oppose / mixed, and `mixed` is a real
   mixed position — a voter who holds both halves of an issue. It is not "I do
   not know". So "Not sure" writes no key, counts for nothing, and still moves
   to Screen C: the officeholder's record on an issue you are undecided about is
   exactly the thing that might decide it. Same for "Skip for now". Neither of
   them may ever invent a stance.

   WHAT THIS DELIBERATELY DOES NOT DO

     · No Direction Match number, and no Word vs Action verdict, anywhere on
       these three screens. Both are real surfaces elsewhere; neither belongs on
       the screen where a voter is learning what a stance is for. The formal
       pattern band and the stated label are printed side by side without a
       judgement between them.
     · No party. Not as a chip, not as a filter, not as a colour.
     · No blended score, and no completion percentage. A voter's positions are
       not a profile to fill in, and three is a suggestion, not a grade.
     · No new top-level route or nav item. This paints INSIDE #ballot-workspace.
     · It never blocks. It is dismissible, it stays out of the way once three
       keys are set, and a reader who already has positions never sees A or B.

   WHERE IT MOUNTS, AND WHY THAT MATTERS

   ballot-workspace.js owns #bw-body and rewrites its innerHTML on every paint.
   So this card is a SIBLING of #bw-body inside #ballot-workspace, repositioned
   on each sync:

     · located   → before #bw-body. The coach leads, the desk follows.
     · not located → after #bw-body, so the existing location card is genuinely
       the first thing on the page. Until a location resolves (or the reader
       skips it) the coach is one line, not three screens: there is no seat to
       put an answer against yet.

   Nothing here is on the critical path. If the resolver, the issue vocabulary,
   the scope table, the colours or the formal index are missing, the matching
   screen degrades to the honest sentence and the desk below is untouched.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (window.PDXDoor2FirstRun) return;

  var KEY = 'pdx_d2_first_run_v1';
  var COLLECTION = 'door2FirstRun';
  var MOUNT_ID = 'ballot-workspace';
  var BODY_ID = 'bw-body';
  var CARD_ID = 'd2fr';
  var GOAL = 3;                 // a suggestion, never a denominator on screen
  var HITS = 5;                 // typeahead results, hard cap
  var HOLDER_CAP = 2;           // U.S. Senate is two seats; nothing needs three

  // ── THE TWELVE ────────────────────────────────────────────────────────────
  // Every one of these is a real ISSUE_MAP key AND has a locked scope sentence
  // in issue-scope.js, so Screen B can never open on the "no definition yet"
  // placeholder. Where the vocabulary carries both poles of an argument (guns,
  // energy, schools) both are here: a first screen that offered one side of
  // each fight would be a push poll with chips.
  var STARTERS = [
    'housing', 'prop_tax', 'cut_spending', 'border_security',
    'gun_rights', 'gun_safety', 'energy_production', 'climate_action',
    'public_schools', 'school_choice', 'healthcare', 'water'
  ];

  function fn(v) { return typeof v === 'function'; }
  function gfn(n) { return typeof window[n] === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/button>'; + inner;/g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function jsq(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

  // ── State ─────────────────────────────────────────────────────────────────
  // PDXStore when a document declares it, plain localStorage otherwise (/ballot
  // does not load the collection manager). Never throws: a reader with storage
  // switched off gets Screen A every visit, which is the safe direction — the
  // coach reappears, and nothing pretends they answered anything.
  function readState() {
    var raw = null;
    try {
      var S = window.PDXStore;
      if (S && fn(S.read)) raw = S.read(KEY, null);
      else if (window.localStorage) raw = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') raw = {};
    return {
      dismissed: raw.dismissed === true,
      collapsed: raw.collapsed === true,
      adding: raw.adding === true,
      locSkipped: raw.locSkipped === true,
      pending: raw.pending ? String(raw.pending) : '',
      focus: raw.focus ? String(raw.focus) : '',
      unsure: raw.unsure ? String(raw.unsure) : '',
      at: Number(raw.at) || 0
    };
  }
  function writeState(patch) {
    var next = readState();
    Object.keys(patch || {}).forEach(function (k) { next[k] = patch[k]; });
    next.at = Date.now();
    try {
      var S = window.PDXStore;
      if (S && fn(S.write)) { S.write(KEY, next, { collection: COLLECTION }); return next; }
      if (window.localStorage) window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {}
    return next;
  }

  // ── The vocabulary, read and never copied ─────────────────────────────────
  function imap() { try { return window.ISSUE_MAP || null; } catch (e) { return null; } }
  function known(k) { var M = imap(); return !!(k && M && M[k]); }
  function labelOf(k) {
    var M = imap(); var e = M && M[k];
    return (e && e.label) || String(k || '');
  }
  // The locked sentence, in the order the app already prefers: issue-scope.js's
  // "what counts as inside this issue", then ISSUE_MAP's own one-liner. Nothing
  // on these screens describes an issue in words written in this file.
  function scopeOf(k) {
    try {
      var S = window.PDXIssueScope;
      if (S && fn(S.read)) {
        var r = S.read(k);
        if (r && r.defined && r.inn) return r.inn;
        if (r && r.chip) return r.chip;
      }
    } catch (e) {}
    var M = imap(); var e = M && M[k];
    return (e && e.chip) || '';
  }
  function skin(k) {
    try {
      var C = window.PDXIssueColors;
      if (C && fn(C.skin)) {
        var s = C.skin(k, window.coreIssueForKey);
        if (s && s.on) return s.attr || '';
      }
    } catch (e) {}
    return '';
  }

  // ── The store, both ends of the one lineage ───────────────────────────────
  function stanceKeys() {
    var out = [];
    try {
      var P = window.PDXStances;
      if (P && fn(P.all)) {
        var all = P.all() || {};
        Object.keys(all).forEach(function (k) { if (known(k) && out.indexOf(k) === -1) out.push(k); });
        if (out.length) return out;
      }
    } catch (e) {}
    try {
      var set = window._alignIssues;
      if (set && fn(set.forEach)) {
        set.forEach(function (k) { if (known(k) && out.indexOf(k) === -1) out.push(k); });
      }
    } catch (e) {}
    return out;
  }
  function stanceCount() { return stanceKeys().length; }
  function positionOf(k) {
    try {
      var P = window.PDXStances;
      if (P && fn(P.get)) {
        var rec = P.get(k);
        if (rec && rec.position) return rec.position;
      }
    } catch (e) {}
    try {
      var lv = window._alignIntensity && window._alignIntensity[k];
      if (lv === 'oppose') return 'oppose';
      if (lv === 'neutral') return 'mixed';
      var set = window._alignIssues;
      if (set && fn(set.has) && set.has(k)) return 'support';
    } catch (e) {}
    return '';
  }
  // One write. PDXStances when the document carries it (it projects down into
  // the signature itself); the signature directly when it does not (my-stances
  // adopts it back on the next document that loads it). Returns whether a key
  // landed, and refuses anything outside the vocabulary — the chips and the
  // typeahead both come from ISSUE_MAP, so a refusal here means a caller
  // invented a key.
  function setStance(k, position) {
    if (!known(k)) return false;
    if (position !== 'support' && position !== 'oppose') return false;
    try {
      var P = window.PDXStances;
      if (P && fn(P.set)) { P.set(k, position, 'medium'); return true; }
    } catch (e) {}
    try {
      if (gfn('alignSetIntensity')) {
        window.alignSetIntensity(k, position === 'oppose' ? 'oppose' : 'support');
        return true;
      }
    } catch (e) {}
    return false;
  }

  // ── The seat this desk has open, and who holds it ─────────────────────────
  function reps() { try { return gfn('pdxRepsForMe') ? window.pdxRepsForMe() : null; } catch (e) { return null; } }
  function located() { var r = reps(); return !!(r && r.located); }
  function bw() { return window.PDXBallotWorkspace || null; }
  function openSeat() {
    var W = bw();
    try { if (W && fn(W._open)) return W._open() || ''; } catch (e) {}
    try {
      var list = (W && fn(W._workable)) ? W._workable() : [];
      return (list && list.length) ? list[0].key : '';
    } catch (e) {}
    return '';
  }
  function seatLabel(rk) {
    var W = bw();
    try {
      var list = (W && fn(W._seats)) ? W._seats() : [];
      for (var i = 0; i < list.length; i++) if (list[i].key === rk) return list[i].label || rk;
    } catch (e) {}
    return rk || '';
  }
  // Holders for the open seat, or — when no ballot seat resolves — the whole
  // resolved list, which is the "who represents me" fallback the brief asks
  // for. Both come from the resolver; neither is a curated default.
  function holders() {
    var rk = openSeat();
    if (rk && gfn('pdxSeatHolders')) {
      try {
        var h = window.pdxSeatHolders(rk);
        if (h && h.pids && h.pids.length) {
          return { seat: rk, label: seatLabel(rk), pids: h.pids.slice(0, HOLDER_CAP), gap: !!h.districtGap };
        }
        if (h && h.districtGap) return { seat: rk, label: seatLabel(rk), pids: [], gap: true };
      } catch (e) {}
    }
    var r = reps(); var pids = [];
    try {
      ((r && r.levels) || []).forEach(function (lv) {
        if (lv && lv.pid && pids.indexOf(lv.pid) === -1) pids.push(lv.pid);
      });
    } catch (e) {}
    return { seat: '', label: '', pids: pids.slice(0, HOLDER_CAP), gap: false };
  }
  function nameOf(pid) {
    try { if (gfn('_pdxPersonById')) { var p = window._pdxPersonById(pid); if (p && p.name) return p.name; } } catch (e) {}
    try { var q = window.CMP_DATA && window.CMP_DATA[pid]; if (q && q.name) return q.name; } catch (e) {}
    return pid || '';
  }
  // One read of one issue for one person. Door 1's workspace prints the same
  // two fields from the same index; this is not a second definition of a
  // formal pattern.
  function fpiRow(pid, k) {
    try {
      var C = window.PDXConsistency;
      var I = C && C.formalPatternIndex;
      if (!I || !fn(I.rowFor)) return null;
      return I.rowFor(pid, k) || null;
    } catch (e) { return null; }
  }

  // ── Which beat are we on ──────────────────────────────────────────────────
  // One function, so no screen can paint for a reason another screen disagrees
  // with. 'gate' is the one line that sits under the existing location card.
  var _wrote = false;           // a stance was set in THIS visit
  function screen() {
    var st = readState();
    if (st.dismissed) return 'off';
    if (!located() && !st.locSkipped) return 'gate';
    if (st.pending && known(st.pending)) return 'B';
    // ASKED FOR ANOTHER ISSUE, SO GIVE THEM THE CHIPS. Without this, a reader
    // who already holds three positions and taps "Add another issue" from the
    // shrunken hint would fall straight back through the count branch below into
    // the hint they just left — the one control on that line, dead.
    if (st.adding) return 'A';
    var n = stanceCount();
    if (n >= GOAL) {
      // Reached three here, and has not tapped through yet → the last full card,
      // carrying "See my ballot on these." Arrived with three already → the
      // one-line hint, because the loop is done and they did not come back for
      // a lesson.
      if (_wrote && !st.collapsed) return 'C';
      return 'hint';
    }
    if (st.collapsed) return 'hint';
    if (n >= 1 || (st.focus && known(st.focus))) return 'C';
    return 'A';
  }
  // The issue Screen C reads. The one just answered, else the newest key the
  // store holds — never a curated "featured" issue.
  function focusKey() {
    var st = readState();
    if (st.focus && known(st.focus)) return st.focus;
    var keys = stanceKeys();
    return keys.length ? keys[keys.length - 1] : '';
  }

  // ── Screen A ──────────────────────────────────────────────────────────────
  function chipHtml(k) {
    return '<button type="button" class="d2fr-chip"' + skin(k) +
      ' onclick="window.PDXDoor2FirstRun.pick(\'' + jsq(k) + '\')">' +
      esc(labelOf(k)) + '</button>';
  }
  // Typeahead over label AND scope sentence, so "Great Salt Lake" finds water
  // and "rent" finds housing. Five hits, hard cap, label match ranked first.
  function search(q) {
    var s = String(q == null ? '' : q).trim().toLowerCase();
    if (s.length < 2) return [];
    var M = imap(); if (!M) return [];
    var head = []; var tail = [];
    Object.keys(M).forEach(function (k) {
      if (head.length + tail.length >= 200) return;
      var lab = String(labelOf(k)).toLowerCase();
      if (lab.indexOf(s) !== -1) { head.push(k); return; }
      if (String(scopeOf(k)).toLowerCase().indexOf(s) !== -1) tail.push(k);
    });
    return head.concat(tail).slice(0, HITS);
  }
  function screenA() {
    var chips = STARTERS.filter(known);
    return '' +
      '<p class="d2fr-eyebrow">First move</p>' +
      '<h3 class="d2fr-h">What do you care about first?</h3>' +
      '<p class="d2fr-sub">Pick one. You will see where the people in your seats actually stand on it.</p>' +
      '<div class="d2fr-chips">' + chips.map(chipHtml).join('') + '</div>' +
      '<div class="d2fr-find">' +
        '<label class="d2fr-lab" for="d2fr-q">Something else?</label>' +
        '<input id="d2fr-q" class="d2fr-q" type="text" autocomplete="off" spellcheck="false"' +
          ' placeholder="Type an issue…" oninput="window.PDXDoor2FirstRun._hits(this.value)" />' +
        '<div id="d2fr-hits" class="d2fr-hits"></div>' +
      '</div>' +
      '<p class="d2fr-foot"><button type="button" class="d2fr-quiet" onclick="window.PDXDoor2FirstRun.skip()">Skip for now</button></p>';
  }
  function hitsHtml(q) {
    var list = search(q);
    if (!list.length) return '';
    return list.map(function (k) {
      var sc = scopeOf(k);
      return '<button type="button" class="d2fr-hit"' + skin(k) +
        ' onclick="window.PDXDoor2FirstRun.pick(\'' + jsq(k) + '\')">' +
        '<span class="d2fr-hit-l">' + esc(labelOf(k)) + '</span>' +
        (sc ? '<span class="d2fr-hit-s">' + esc(sc) + '</span>' : '') +
        '</button>';
    }).join('');
  }

  // ── Screen B ──────────────────────────────────────────────────────────────
  function screenB(k) {
    var sc = scopeOf(k);
    return '' +
      '<p class="d2fr-eyebrow">Your position</p>' +
      '<h3 class="d2fr-h"' + skin(k) + '>' + esc(labelOf(k)) + '</h3>' +
      (sc ? '<p class="d2fr-scope">' + esc(sc) + '</p>' : '') +
      '<div class="d2fr-answers">' +
        '<button type="button" class="d2fr-ans d2fr-ans-for" onclick="window.PDXDoor2FirstRun.answer(\'' + jsq(k) + '\',\'support\')">Support</button>' +
        '<button type="button" class="d2fr-ans d2fr-ans-against" onclick="window.PDXDoor2FirstRun.answer(\'' + jsq(k) + '\',\'oppose\')">Oppose</button>' +
        '<button type="button" class="d2fr-ans d2fr-ans-unsure" onclick="window.PDXDoor2FirstRun.answer(\'' + jsq(k) + '\',\'unsure\')">Not sure</button>' +
      '</div>' +
      '<p class="d2fr-foot">' +
        '<button type="button" class="d2fr-quiet" onclick="window.PDXDoor2FirstRun.back()">Different issue</button>' +
        '<span class="d2fr-dot">·</span>' +
        '<button type="button" class="d2fr-quiet" onclick="window.PDXDoor2FirstRun.skip()">Skip for now</button>' +
      '</p>';
  }

  // ── Screen C ──────────────────────────────────────────────────────────────
  // The proof. One issue, the people who hold the seat, their formal pattern on
  // THAT issue, their stated word under it. No verdict between the two lines:
  // Word vs Action is a different surface and stays there.
  // Same rule as the desk below: a name is the address of that person's record,
  // and person-link.js decides both the advertised pid and who owns the click.
  function nameHtml(pid) {
    var nm = esc(nameOf(pid));
    try {
      var PL = window.PDXPersonLink;
      var a = (PL && fn(PL.attrs)) ? PL.attrs(pid) : '';
      if (a) return '<a class="d2fr-nm" ' + a + '>' + nm + '</a>';
    } catch (e) {}
    return '<button type="button" class="d2fr-nm"' +
      ' onclick="if(window.showProfile)window.showProfile(\'' + jsq(pid) + '\')">' + nm + '</button>';
  }
  function holderHtml(pid, k) {
    var row = fpiRow(pid, k);
    var out = '<li class="d2fr-holder">' + nameHtml(pid);
    if (row) {
      var bits = [row.patLabel, row.counts].filter(Boolean).map(esc).join(' · ');
      out += '<span class="d2fr-pat">' + (bits || 'On the formal record for this issue') + '</span>';
      if (row.said && row.stance) {
        out += '<span class="d2fr-said">Stated: ' + esc(row.stance) + '</span>';
      }
    } else {
      out += '<span class="d2fr-pat d2fr-thin">Nothing on the formal record for this issue yet — a gap in the file, not a finding.</span>';
    }
    return out + '</li>';
  }
  function screenC(k) {
    var st = readState();
    var n = stanceCount();
    var h = holders();
    var pos = positionOf(k);
    var unsure = st.unsure === k && !pos;
    var head = h.seat
      ? 'Your seat: ' + h.label
      : 'Who represents you';
    var body;
    if (h.pids.length) {
      body = '<ul class="d2fr-holders">' + h.pids.map(function (p) { return holderHtml(p, k); }).join('') + '</ul>';
    } else if (h.gap) {
      body = '<p class="d2fr-thin">We do not draw this district line yet, so there is no holder to read on it.</p>';
    } else {
      body = '<p class="d2fr-thin">Still resolving who holds this seat.</p>';
    }
    var mine = pos === 'oppose' ? 'You oppose this.'
      : pos === 'mixed' ? 'You hold both halves of this.'
      : pos === 'support' ? 'You support this.'
      : unsure ? 'You did not take a side on this one. The record below is theirs either way.'
      : '';
    var cta = n >= GOAL
      ? '<button type="button" class="d2fr-cta" onclick="window.PDXDoor2FirstRun.seeBallot()">See my ballot on these.</button>'
      : '<button type="button" class="d2fr-cta" onclick="window.PDXDoor2FirstRun.back()">Add another issue</button>';
    return '' +
      '<p class="d2fr-eyebrow">' + esc(head) + '</p>' +
      '<h3 class="d2fr-h"' + skin(k) + '>' + esc(labelOf(k)) + '</h3>' +
      (mine ? '<p class="d2fr-mine">' + esc(mine) + '</p>' : '') +
      body +
      '<p class="d2fr-act">' + cta + '</p>';
  }

  // ── The gate line, and the shrunken hint ──────────────────────────────────
  function screenGate() {
    return '' +
      '<p class="d2fr-line">Set your location above and this desk will read your issues on whoever holds your seats. ' +
      '<button type="button" class="d2fr-quiet" onclick="window.PDXDoor2FirstRun.skipLocation()">Or pick an issue first</button></p>';
  }
  // Two shrunken states, one node. A reader who set positions is told the desk
  // is using them; a reader who skipped is told what setting one would buy. The
  // second must never imply they have positions they do not have.
  function screenHint() {
    var lead = stanceCount()
      ? 'Your issues are set, and this desk reads them on whoever holds your seats. '
      : 'Set one issue and this desk will read it on whoever holds your seats. ';
    return '<p class="d2fr-line">' + lead +
      '<button type="button" class="d2fr-quiet" onclick="window.PDXDoor2FirstRun.back()">Add another issue</button></p>';
  }

  // ── Paint ─────────────────────────────────────────────────────────────────
  function card() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return null;
    var el = document.getElementById(CARD_ID);
    if (!el) {
      el = document.createElement('section');
      el.id = CARD_ID;
      el.className = 'd2fr';
      el.setAttribute('aria-label', 'Set an issue');
    }
    // The desk rewrites #bw-body on every paint, so this lives BESIDE it and is
    // re-placed on each sync rather than parented into the thing that gets
    // wiped. Before the body once a location resolves (the coach leads); after
    // it while the location is still unset, so the existing location card is
    // genuinely the first thing on the page.
    var body = document.getElementById(BODY_ID);
    if (!body || body.parentNode !== mount) {
      if (el.parentNode !== mount) mount.appendChild(el);
      return el;
    }
    var after = screen() === 'gate';
    var settled = after ? (body.nextSibling === el) : (el.nextSibling === body);
    if (!settled) {
      try { mount.insertBefore(el, after ? body.nextSibling : body); }
      catch (e) { try { mount.appendChild(el); } catch (e2) {} }
    }
    return el;
  }
  function sync() {
    var el = document.getElementById(CARD_ID);
    var s = screen();
    if (s === 'off') { if (el && el.parentNode) el.parentNode.removeChild(el); return s; }
    el = card();
    if (!el) return s;
    var inner = '';
    if (s === 'gate') inner = screenGate();
    else if (s === 'A') inner = screenA();
    else if (s === 'B') inner = screenB(readState().pending);
    else if (s === 'C') {
      var k = focusKey();
      if (!k) { inner = screenA(); s = 'A'; } else inner = screenC(k);
    } else inner = screenHint();
    // A SETTLE REPAINT MUST NOT EAT A TYPED QUERY. The roster, the resolver and
    // the record lane all land after the first paint and each one repaints this
    // card; on Screen A that would clear the typeahead mid-word. So if the
    // reader is already on Screen A with something in the box, the beat has not
    // changed and there is nothing to repaint.
    if (s === 'A' && el.getAttribute('data-screen') === 'A') {
      var q = document.getElementById('d2fr-q');
      if (q && q.value) return s;
    }
    el.setAttribute('data-screen', s);
    el.setAttribute('data-size', (s === 'gate' || s === 'hint') ? 'line' : 'card');
    // Dismissible on EVERY screen, including the one-line states. A nudge a
    // reader cannot turn off is not a nudge.
    el.innerHTML = '<button type="button" class="d2fr-x" aria-label="Dismiss" onclick="window.PDXDoor2FirstRun.dismiss()">×</button>' + inner;
    return s;
  }

  // ── The actions, one per tap ──────────────────────────────────────────────
  function pick(k) {
    if (!known(k)) return;
    writeState({ pending: k, collapsed: false, adding: false, unsure: '' });
    sync();
  }
  function answer(k, position) {
    if (!known(k)) return;
    if (position === 'support' || position === 'oppose') {
      if (setStance(k, position)) _wrote = true;
      writeState({ pending: '', focus: k, unsure: '', collapsed: false, adding: false });
    } else {
      // Not sure: no key, no count, still the desk.
      writeState({ pending: '', focus: k, unsure: k, collapsed: false, adding: false });
    }
    sync();
  }
  function back() { writeState({ pending: '', focus: '', unsure: '', collapsed: false, adding: true }); _wrote = false; sync(); }
  function skip() { writeState({ pending: '', collapsed: true, adding: false }); sync(); }
  function skipLocation() { writeState({ locSkipped: true }); sync(); }
  function dismiss() { writeState({ dismissed: true, pending: '', adding: false }); sync(); }
  function reset() { writeState({ dismissed: false, collapsed: false, locSkipped: false, pending: '', focus: '', unsure: '', adding: false }); _wrote = false; sync(); }
  function seeBallot() {
    writeState({ collapsed: true, adding: false });
    _wrote = false;
    sync();
    try {
      var body = document.getElementById(BODY_ID);
      if (body && fn(body.scrollIntoView)) body.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {}
  }
  function hits(q) {
    var box = document.getElementById('d2fr-hits');
    if (!box) return;
    box.innerHTML = hitsHtml(q);
  }

  window.PDXDoor2FirstRun = {
    KEY: KEY, COLLECTION: COLLECTION, CARD_ID: CARD_ID, GOAL: GOAL, HITS: HITS,
    STARTERS: STARTERS,
    sync: sync, screen: screen, pick: pick, answer: answer, back: back,
    skip: skip, skipLocation: skipLocation, dismiss: dismiss, reset: reset,
    seeBallot: seeBallot, search: search,
    _hits: hits,
    // Pure reads, exposed for the harness: the store the answers land in, the
    // beat logic's two inputs, and the one row Screen C prints.
    _state: readState, _keys: stanceKeys, _count: stanceCount,
    _set: setStance, _position: positionOf, _focus: focusKey,
    _located: located, _holders: holders, _row: fpiRow,
    _scope: scopeOf, _label: labelOf
  };

  // ── Staying in step ───────────────────────────────────────────────────────
  // Same doctrine as the desk it sits on: wrap the functions that announce a
  // change rather than poll, mark each wrapper so a double boot cannot stack
  // two, and keep a short bounded settle schedule because the resolver, the
  // roster and the record lane are all deferred and any of them can land after
  // the first paint.
  function wrap(name, flag) {
    if (!gfn(name) || window[name][flag]) return;
    var orig = window[name];
    var w = function () {
      var out;
      try { out = orig.apply(this, arguments); } catch (e) { out = undefined; }
      try { sync(); } catch (e) {}
      return out;
    };
    w[flag] = true;
    try { window[name] = w; } catch (e) {}
  }
  function hook() {
    wrap('_updateTeamPositionsForLocation', '__d2frLoc');
    wrap('pdxBallotWorkspaceOpen', '__d2frSeat');
    wrap('alignSetIntensity', '__d2frAlign');
    wrap('alignToggleIssue', '__d2frToggle');
  }
  function boot() {
    hook();
    sync();
    [400, 1200, 3000].forEach(function (ms) { setTimeout(function () { hook(); sync(); }, ms); });
    try { if (gfn('pdxRosterReady')) window.pdxRosterReady(sync); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
