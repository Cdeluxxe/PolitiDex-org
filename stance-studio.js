/* ═══════════════════════════════════════════════════════════════════════════
   stance-studio.js — /my-stances, THE STANCE STUDIO. IT TEACHES ITSELF.
   ───────────────────────────────────────────────────────────────────────────
   WHAT THIS FIXES. Setting a position was the one act this whole site asks a
   voter to perform, and the only surface for it was the every-issue collection
   — 121 folded cards behind a search box, which is a survey, not an
   invitation. So the act that everything downstream depends on was the act
   nobody completed, and eight modules pointed at it with a scroll that landed
   on the homepage.

   THIS MODULE IS ONE DOCUMENT WITH TWO MODES, decided by ONE question: is
   there a position on file?

     MODE A · NOTHING ON FILE. A self-tutorial, one beat at a time, and the
     three beats are the three things a reader must learn to use the rest of
     the site:

       pick   "What do you care about first?" — twelve starter chips and a
              search that takes the reader's OWN words. The helper line under
              the field is the whole lesson: if the chip name is not the word
              you use, type how you would say it, and the scope sentence is
              what we mean. A reader who learns that one move can find any of
              the 121 keys for the rest of their life on this site.
       ask    THAT ISSUE ONLY. The locked scope sentence, then Support, Oppose
              or Not sure. Nothing else is on the screen, because a definition
              is the thing being read and a second issue beside it is a
              distraction from the only question asked.
       done   WHAT THAT DID. One line, in the plainest words available: it is
              on your file, and your ballot will use it when it reads a
              person's formal record on this issue. That sentence is the entire
              payoff of the loop and it is why there is no score here.

     MODE B · SOMETHING ON FILE. The library first: one chip per position
     actually held, the search that found them still sitting there, and the
     starter row folded away under "Add an issue". Tapping a chip re-opens the
     ask beat for that issue, where it can be changed or cleared.

   THE WALLS, AND WHY EACH ONE IS A WALL.

     · NO SCORE, NO MATCH, NO PERCENT, NO PARTY. Nothing on this surface
       measures the reader and nothing here measures a politician. Direction
       Match and Word vs Action are not computed, not read and not named. The
       count is "3 positions on file" — the length of a list, written as a
       sentence, with no denominator. There is no "1 of 3", no ring, no meter
       and no grade. GOAL exists to change a BUTTON LABEL and for nothing else.

     · NO THIRD STORAGE KEY. This module declares no storage of its own. Not
       one byte. Every position goes through PDXStances into
       pdx_my_stances_v1 — the same store /me's editor writes and the same
       store the alignment signature reads — and every scrap of transient beat
       state lives in memory and in the URL. That is not a compromise: ?issue=
       and ?add=1 are deep links the brief asks for, which means the address
       bar IS the state, so a third key would have been a second copy of
       something the URL already says.

       THE ONE CONSEQUENCE, STATED PLAINLY: "Skip the tutorial" lasts for the
       visit, not forever. A reader who skips, still holds nothing, and comes
       back tomorrow meets the tutorial again — dismissible again. That is the
       safe direction. The alternative is a flag that remembers a reader
       declined to learn the one skill this site needs them to have, and then
       never offers it again.

     · NOTHING INVENTS A POSITION. "Not sure" writes nothing. "Skip for now"
       writes nothing. Clearing writes a removal and nothing else. There is no
       default, no pre-selection and no inferred side anywhere in this file.

     · MIXED IS NOT "DON'T KNOW", so this module cannot produce it. Mixed means
       a reader who genuinely holds both halves of an argument, which is a
       considered position and belongs to the every-issue collection where
       there is room to say why. The ask beat offers Support, Oppose and Not
       sure. A `mixed` record made in the collection still counts as a side
       here — it is a position on file, and the mode question is only ever "is
       there a position on file?".

     · FORMAL RECORD PRIMARY, WHICH IS WHY NO PERSON IS NAMED HERE. The record
       engine is ~3.6 MB — consistency.js, the politician stance corpus, the
       vote waves — and it is deliberately absent from this document. So this
       module CANNOT read a formal pattern, and it therefore refuses to print a
       person. A name with no record under it is the precise inversion of
       "record first, their word under it". Where the reader already has a seat
       open on their ballot, the done beat says so and hands them to /ballot,
       which owns record-versus-position and has the engine to do it. Where
       there is no seat, that line is absent and the save is unaffected.

   WHAT THIS MODULE DOES NOT DO. It does not score, rank, compare, sort by
   agreement, name a party, read a finance figure, mount a second editor, or
   own a single word of issue prose — every label comes from ISSUE_MAP and
   every definition from issue-scope.js's locked sentences, read at paint time
   and never copied into this file.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXStanceStudio) return;   // idempotent — a double script tag paints once

  var HOST = 'mst';                 // the div this module owns, and the only one
  var GOAL = 3;                     // changes a button label. Never a denominator.
  var HITS = 5;                     // typeahead results, hard cap
  var MINQ = 2;                     // shorter than this is not a query, it is typing
  var WALK = 400;                   // candidates examined per search, a paint-cost bound
  var SEAT_KEY = 'pdx_bw_seat';     // ballot-workspace.js's own session key, read only

  // ── THE TWELVE ────────────────────────────────────────────────────────────
  // Every one is a real ISSUE_MAP key AND carries a locked scope sentence in
  // issue-scope.js, so the ask beat can never open on a missing definition.
  // Where the vocabulary holds both poles of a fight — guns, energy, schools —
  // BOTH are here. A starter row with gun rights and no gun safety would be a
  // push poll with chips, and a reader would be right to distrust the rest.
  var STARTERS = [
    'housing', 'prop_tax', 'cut_spending', 'border_security',
    'gun_rights', 'gun_safety', 'energy_production', 'climate_action',
    'public_schools', 'school_choice', 'healthcare', 'water'
  ];

  // THE LESSON, IN TWO STRINGS. The placeholder names four things a reader
  // might actually care about in words no chip uses, and every one of them
  // resolves: turf reaches Water Conservation through its locked sentence,
  // data centers reaches three datacenter keys by label, fentanyl reaches the
  // immigration-fentanyl key, vouchers reaches School Choice through its
  // sentence. Copy that teaches a search term the search cannot find would be
  // worse than no copy, so scripts/test-my-stances.mjs asserts all four.
  var PLACEHOLDER = 'Anything specific — turf, data centers, fentanyl, vouchers…';
  var HELPER = 'If the chip name isn’t the word you use, type how you’d say it. The scope sentence is what we mean.';

  function fn(v) { return typeof v === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function jsq(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function host() { try { return document.getElementById(HOST); } catch (e) { return null; } }

  // ── THE BEAT · in memory, and in the address bar ──────────────────────────
  // No storage. `pending` is which issue the ask beat is open on, `focus` is
  // which issue the done beat is reporting, `unsure` marks that the answer was
  // "Not sure" so the done beat can say that truthfully instead of implying a
  // side was taken. `q` is the live query, held here so a repaint triggered by
  // a store event does not wipe what the reader is halfway through typing.
  // `mode` is STICKY FOR THE VISIT and decided once, on the first paint, by the
  // only question that decides it: was anything on file when the reader
  // arrived? It is sticky because the alternative re-derives the mode from
  // count() on every paint, and then saving the FIRST position — the whole
  // point of mode A — would flip the surface into mode B and the reader would
  // never see what their answer just did. The tutorial's third beat is the
  // payoff of the tutorial; a mode that recomputes itself deletes it.
  var _beat = { mode: '', pending: '', focus: '', unsure: false, adding: false, q: '' };

  // ── The vocabulary, read and never copied ─────────────────────────────────
  function imap() { try { return window.ISSUE_MAP || null; } catch (e) { return null; } }
  function known(k) { var M = imap(); return !!(k && M && M[k]); }
  function labelOf(k) { var M = imap(); var e = M && M[k]; return (e && e.label) || String(k || ''); }
  // The locked sentence, in the order the app already prefers: issue-scope.js's
  // "what counts as inside this issue", then ISSUE_MAP's own one-liner. No
  // issue is ever described in words written in this file.
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
  // The same per-issue colour every other surface uses, arriving as inline
  // custom properties so stance-studio.css needs no per-key rules.
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

  // ── The store · ONE READER, AND IT IS NOT IN THIS FILE ────────────────────
  // sides() used to be implemented here: walk PDXStances.all(), fall back to
  // the alignment signature when the collection manager had not arrived. It
  // was correct, and that was the problem — /me walked a different store and
  // /ballot walked the signature, so three surfaces answered "which sides does
  // this person hold" three ways and one of them printed "Nothing on file yet"
  // over three saved positions.
  //
  // THE ANSWER LIVES IN stance-sides.js NOW and this asks it. The trap that
  // makes the question worth centralising — PDXStances.all() is an ARRAY, so
  // Object.keys() over it yields "0","1","2" and the list comes back empty
  // without throwing — is written down there, once, beside the loop that must
  // not re-enter it.
  //
  // AN ABSENT MODULE RETURNS NOTHING, deliberately. There is no second walk
  // behind this one: a private copy kept "just in case" is how the three
  // readers happened in the first place. /my-stances ships stance-sides.js, and
  // scripts/test-stance-sides.mjs asserts every document that prints a side
  // carries it.
  function sides() {
    try {
      var S = window.PDXStanceSides;
      if (S && fn(S.list)) return S.list() || [];
    } catch (e) {}
    return [];
  }
  function count() { return sides().length; }
  function positionOf(k) {
    try {
      var S = window.PDXStanceSides;
      if (S && fn(S.position)) return S.position(k) || '';
    } catch (e) {}
    return '';
  }

  // ONE WRITE PATH, and it refuses anything it does not understand. 'mixed' is
  // accepted because the every-issue collection can produce it and a caller
  // may legitimately re-assert it; this module's own UI never offers it.
  function write(k, position) {
    if (!known(k)) return false;
    if (position !== 'support' && position !== 'oppose' && position !== 'mixed') return false;
    try {
      var P = window.PDXStances;
      if (P && fn(P.set)) { P.set(k, position, 'medium'); return true; }
    } catch (e) {}
    try {
      if (fn(window.alignSetIntensity)) {
        window.alignSetIntensity(k, position === 'oppose' ? 'oppose' : 'support');
        return true;
      }
    } catch (e2) {}
    return false;
  }
  // CLEARING IS A REMOVAL AND NOTHING ELSE. It does not write a neutral, a
  // mixed or an "unset" marker — the honest representation of "I have no
  // position on this" is the absence of a record.
  function clear(k) {
    if (!known(k)) return false;
    try {
      var P = window.PDXStances;
      if (P && fn(P.remove)) { P.remove(k); return true; }
    } catch (e) {}
    try { if (fn(window.alignToggleIssue) && window._alignIssues && window._alignIssues.has && window._alignIssues.has(k)) { window.alignToggleIssue(k); return true; } } catch (e2) {}
    return false;
  }

  // ── The typeahead · label first, then the locked sentence ─────────────────
  // Label hits rank above sentence hits because a reader who types the name of
  // an issue means that issue. Sentence hits are the lesson working: "turf" is
  // in no label anywhere and reaches Water Conservation only through its
  // locked definition.
  //
  // THE DE-PLURALISING RETRY EXISTS BECAUSE THE PLACEHOLDER PROMISES IT. The
  // copy invites "vouchers", and the word in School Choice's locked sentence is
  // "voucher". A reader who types exactly what the field suggested and gets
  // nothing back learns that the search is broken, so one retry without a
  // trailing s is the cost of the copy being true.
  function search(q) {
    var s = String(q == null ? '' : q).trim().toLowerCase();
    if (s.length < MINQ) return [];
    var r = pass(s);
    if (!r.length && s.length > MINQ && s.charAt(s.length - 1) === 's') r = pass(s.slice(0, -1));
    return r;
  }
  function pass(s) {
    var M = imap(); if (!M) return [];
    var head = []; var tail = []; var seen = 0;
    var keys = Object.keys(M);
    for (var i = 0; i < keys.length; i++) {
      if (seen >= WALK) break;
      seen++;
      var k = keys[i];
      if (String(labelOf(k)).toLowerCase().indexOf(s) !== -1) { head.push(k); continue; }
      if (String(scopeOf(k)).toLowerCase().indexOf(s) !== -1) tail.push(k);
    }
    return head.concat(tail).slice(0, HITS);
  }

  // ── The address bar IS the state ──────────────────────────────────────────
  // ?issue=<key> opens the ask beat on that issue, from anywhere in the app.
  // ?add=1 opens the starter row and the search. Both are read once on boot
  // and then cleared from the address, because a reader who answers the issue
  // the link named and then reloads should not be handed the same question a
  // second time.
  function readUrl() {
    var p = null;
    try { p = new URLSearchParams(location.search || ''); } catch (e) { return; }
    var k = p.get('issue');
    if (k && known(k)) _beat.pending = k;
    // ?add=1 — "open the starter list and the search". In mode A that is
    // already the pick beat, so the flag only has work to do in mode B, where
    // it unfolds the starter row under the library.
    if (p.get('add') === '1' || p.get('add') === 'true') _beat.adding = true;
    if (!k && p.get('add') == null) return;
    try {
      p.delete('issue'); p.delete('add');
      var qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + (location.hash || ''));
    } catch (e2) {}
  }

  // ── Which beat ────────────────────────────────────────────────────────────
  // ONE function, so no screen can paint for a reason another screen disagrees
  // with. The mode question is asked once, here, and it is only ever "is there
  // a position on file?".
  function mode() {
    if (!_beat.mode) _beat.mode = count() ? 'B' : 'A';
    return _beat.mode;
  }
  function beat() {
    // The ask beat is reachable from BOTH modes — a starter chip in the
    // tutorial and a held chip in the library both land on the same question,
    // because there is only one way to take a position in this module.
    if (_beat.pending && known(_beat.pending)) return 'ask';
    if (mode() === 'A') {
      if (_beat.focus && known(_beat.focus)) return 'done';
      return 'pick';
    }
    return 'library';
  }

  // ═════════════════════════ THE BEATS ══════════════════════════════════════

  function chipHtml(k, on) {
    var a = skin(k);
    return '<button type="button" class="mst-chip' + (on ? ' is-on' : '') + '"' +
      (a ? ' ' + a : '') + ' data-k="' + esc(k) + '"' +
      ' onclick="window.PDXStanceStudio.pick(\'' + jsq(k) + '\')">' +
      esc(labelOf(k)) + '</button>';
  }

  // The search field, identical in both modes. It is the one control the brief
  // asks to be always visible, because it is the skill being taught.
  function findHtml() {
    return '<div class="mst-find">' +
      '<label class="mst-find-l" for="mst-q">Search every issue</label>' +
      '<input id="mst-q" class="mst-q" type="search" autocomplete="off" ' +
        'placeholder="' + esc(PLACEHOLDER) + '" value="' + esc(_beat.q) + '" ' +
        'oninput="window.PDXStanceStudio.type(this.value)" />' +
      '<p class="mst-help">' + esc(HELPER) + '</p>' +
      '<div class="mst-hits" id="mst-hits">' + hitsHtml() + '</div>' +
    '</div>';
  }
  // Each hit shows the label AND the first of the locked sentence, because the
  // sentence is what decides whether this is the issue the reader meant.
  function hitsHtml() {
    var list = search(_beat.q);
    if (!list.length) return '';
    return list.map(function (k) {
      var sc = scopeOf(k);
      return '<button type="button" class="mst-hit"' + (skin(k) ? ' ' + skin(k) : '') +
        ' onclick="window.PDXStanceStudio.pick(\'' + jsq(k) + '\')">' +
        '<span class="mst-hit-l">' + esc(labelOf(k)) + '</span>' +
        (sc ? '<span class="mst-hit-s">' + esc(sc) + '</span>' : '') +
      '</button>';
    }).join('');
  }

  // BEAT 1 · what do you care about first
  function beatPick() {
    return '<div class="mst-card" data-beat="pick">' +
      '<p class="mst-eyebrow">Your stances</p>' +
      '<h2 class="mst-h">What do you care about first?</h2>' +
      '<p class="mst-sub">One issue is enough to start. You can add more whenever you like.</p>' +
      '<div class="mst-chips">' + STARTERS.filter(known).map(function (k) { return chipHtml(k, false); }).join('') + '</div>' +
      findHtml() +
      '<p class="mst-foot">' +
        '<button type="button" class="mst-quiet" onclick="window.PDXStanceStudio.skip()">Skip for now</button>' +
      '</p>' +
    '</div>';
  }

  // BEAT 2 · that issue only
  // The scope sentence is the content of this screen. Support and Oppose carry
  // identical weight, identical colour and identical size — a studio that
  // styled one of them as the affirmative answer would be leaning on the
  // reader at the exact moment it asks them to decide.
  function beatAsk() {
    var k = _beat.pending;
    var sc = scopeOf(k);
    var held = positionOf(k);
    var a = skin(k);
    return '<div class="mst-card" data-beat="ask"' + (a ? ' ' + a : '') + ' data-k="' + esc(k) + '">' +
      '<p class="mst-eyebrow">' + esc(labelOf(k)) + '</p>' +
      '<h2 class="mst-h">Where do you stand?</h2>' +
      (sc ? '<p class="mst-scope">' + esc(sc) + '</p>'
          : '<p class="mst-scope mst-scope--thin">This issue has no scope note on file yet. Your position is still saved against the same key every politician is read on.</p>') +
      (held ? '<p class="mst-mine">On file now: <b>' + esc(posWord(held)) + '</b></p>' : '') +
      '<div class="mst-answers">' +
        '<button type="button" class="mst-ans mst-ans-for" onclick="window.PDXStanceStudio.answer(\'' + jsq(k) + '\',\'support\')">Support</button>' +
        '<button type="button" class="mst-ans mst-ans-against" onclick="window.PDXStanceStudio.answer(\'' + jsq(k) + '\',\'oppose\')">Oppose</button>' +
        '<button type="button" class="mst-ans mst-ans-unsure" onclick="window.PDXStanceStudio.answer(\'' + jsq(k) + '\',\'unsure\')">Not sure</button>' +
      '</div>' +
      '<p class="mst-foot">' +
        '<button type="button" class="mst-quiet" onclick="window.PDXStanceStudio.back()">&larr; Back</button>' +
        (held ? '<button type="button" class="mst-quiet mst-clear" onclick="window.PDXStanceStudio.clear(\'' + jsq(k) + '\')">Clear this position</button>' : '') +
      '</p>' +
    '</div>';
  }
  function posWord(p) {
    if (p === 'support') return 'Support';
    if (p === 'oppose') return 'Oppose';
    if (p === 'mixed') return 'Mixed — you hold both halves';
    return '';
  }

  // BEAT 3 · what that did
  // ONE LINE, and it is the payoff of the entire loop. No percentage, no
  // person, no verdict. The seat line appears only when /ballot has actually
  // resolved a seat for this reader, and it names the FACT rather than a seat
  // label — the label table lives in voter-hub-location.js, which is 249 KB
  // and is not on this document, and a copy of it here would be a second
  // owner of a rule this module has no business owning.
  function beatDone() {
    var k = _beat.focus;
    var a = skin(k);
    var took = !_beat.unsure;
    var n = count();
    return '<div class="mst-card" data-beat="done"' + (a ? ' ' + a : '') + '>' +
      '<p class="mst-eyebrow">' + esc(labelOf(k)) + '</p>' +
      (took
        ? '<h2 class="mst-h">Saved to your file.</h2>' +
          '<p class="mst-line">Your ballot will use this when it reads someone’s formal record on this issue.</p>'
        : '<h2 class="mst-h">Nothing saved — that’s fine.</h2>' +
          '<p class="mst-line">You took no side on this one, so nothing went on your file. The issue is still here whenever you want it.</p>') +
      seatLine(k) +
      '<p class="mst-act">' +
        (n >= GOAL
          ? '<button type="button" class="mst-cta" onclick="window.PDXStanceStudio.seeAll()">See all on file</button>'
          : '<button type="button" class="mst-cta" onclick="window.PDXStanceStudio.another()">Add another issue</button>') +
      '</p>' +
      (n ? '<p class="mst-count">' + countLine(n) + '</p>' : '') +
    '</div>';
  }
  // THE COUNT IS A LENGTH, WRITTEN AS A SENTENCE — and the sentence has one
  // author. PDXStanceSides.countLine() spells it for the studio's done beat,
  // the library heading and /my-stances' own door count, so "3 positions on
  // file" cannot become "3 positions saved" on one of the three. The literal
  // below is what a document without that module would print, and it is the
  // same words.
  function countLine(n) {
    try {
      var S = window.PDXStanceSides;
      if (S && fn(S.countLine)) return S.countLine(n);
    } catch (e) {}
    return String(n) + (n === 1 ? ' position' : ' positions') + ' on file';
  }
  function openSeat() {
    try { return (window.sessionStorage && window.sessionStorage.getItem(SEAT_KEY)) || ''; } catch (e) { return ''; }
  }
  function seatLine(k) {
    if (!openSeat()) return '';
    return '<p class="mst-seat">You have a seat open on your ballot. ' +
      '<a class="mst-seat-a" href="/ballot">See how its candidates’ formal record reads on ' + esc(labelOf(k)) + ' →</a></p>';
  }

  // MODE B · the library
  // Chips for positions ACTUALLY HELD and nothing else. No ghost, no dashed
  // placeholder, no greyed-out suggestion sitting in the same row looking like
  // a saved answer — that shape is the defect this pass removes from /me and
  // it is not going to be reintroduced here.
  function beatLibrary() {
    var list = sides();
    var n = list.length;
    return '<div class="mst-card" data-beat="library">' +
      '<p class="mst-eyebrow">Your stances</p>' +
      (n
        ? '<h2 class="mst-h">' + esc(countLine(n)) + '</h2>' +
          '<p class="mst-sub">Tap one to change it or clear it.</p>' +
          '<div class="mst-chips mst-chips--held">' + list.map(function (r) {
            return '<button type="button" class="mst-held"' + (skin(r.key) ? ' ' + skin(r.key) : '') +
              ' data-k="' + esc(r.key) + '" data-pos="' + esc(r.position) + '"' +
              ' onclick="window.PDXStanceStudio.pick(\'' + jsq(r.key) + '\')">' +
              '<span class="mst-held-l">' + esc(labelOf(r.key)) + '</span>' +
              '<span class="mst-held-p">' + esc(posWord(r.position)) + '</span>' +
            '</button>';
          }).join('') + '</div>'
        : '<h2 class="mst-h">Nothing on file yet.</h2>' +
          '<p class="mst-sub">Search for an issue in your own words, or open the starter list.</p>') +
      findHtml() +
      '<p class="mst-act">' +
        '<button type="button" class="mst-cta mst-cta--quiet" onclick="window.PDXStanceStudio.add()">' +
          (_beat.adding ? 'Hide the starter list' : 'Add an issue') + '</button>' +
      '</p>' +
      (_beat.adding
        ? '<div class="mst-chips mst-chips--start">' + STARTERS.filter(known).map(function (k) {
            return chipHtml(k, !!positionOf(k));
          }).join('') + '</div>'
        : '') +
    '</div>';
  }

  // ── Paint ─────────────────────────────────────────────────────────────────
  // ONE innerHTML per paint, and a guard that refuses to repaint the search
  // field out from under a reader who is typing into it. A store event from
  // another tab arriving mid-word must not eat the word.
  function render() {
    var el = host();
    if (!el) return '';
    var b = beat();
    if (!imap()) {
      el.setAttribute('data-beat', 'wait');
      el.innerHTML = '<div class="mst-card" data-beat="wait"><p class="mst-line">Loading the issue list…</p></div>';
      return 'wait';
    }
    var live = document.activeElement;
    var typing = !!(live && live.id === 'mst-q');
    if (typing && el.getAttribute('data-beat') === b) { paintHits(); return b; }
    el.setAttribute('data-beat', b);
    el.innerHTML = b === 'ask' ? beatAsk()
      : b === 'done' ? beatDone()
      : b === 'library' ? beatLibrary()
      : beatPick();
    return b;
  }
  // The typing path repaints ONLY the hit list, so the field keeps its focus,
  // its selection and its caret.
  function paintHits() {
    try {
      var h = document.getElementById('mst-hits');
      if (h) h.innerHTML = hitsHtml();
    } catch (e) {}
  }

  // ── The controls ──────────────────────────────────────────────────────────
  var API = {
    HOST: HOST, GOAL: GOAL, HITS: HITS, STARTERS: STARTERS,
    PLACEHOLDER: PLACEHOLDER, HELPER: HELPER,

    // One tap, one issue. No multi-select anywhere in this module.
    pick: function (k) {
      if (!known(k)) return;
      _beat.pending = k; _beat.focus = ''; _beat.unsure = false;
      render();
      try { host().scrollIntoView({ block: 'nearest' }); } catch (e) {}
    },
    // 'unsure' WRITES NOTHING and is not a position. It advances to the done
    // beat anyway, because a reader who is undecided has still learned the
    // move, and the done beat says plainly that nothing was saved.
    answer: function (k, position) {
      if (!known(k)) return;
      if (position === 'unsure') {
        _beat.unsure = true;
      } else {
        if (!write(k, position)) return;
        _beat.unsure = false;
      }
      _beat.pending = '';
      _beat.focus = k;
      render();
    },
    clear: function (k) {
      if (!known(k)) return;
      clear(k);
      _beat.pending = ''; _beat.focus = ''; _beat.unsure = false;
      render();
    },
    back: function () { _beat.pending = ''; render(); },
    // SKIP THE TUTORIAL. Not a dismissal of the page — the reader still gets
    // the library and the search, which is everything the page does minus the
    // lesson. Writes nothing, and cannot: there is no flag to write to.
    skip: function () { _beat.mode = 'B'; _beat.pending = ''; _beat.focus = ''; render(); },
    // MODE A's PRIMARY, and it means "ask me the first question again". It
    // stays in the tutorial deliberately: a reader on their second issue is
    // still learning the move, and dropping them into the library mid-lesson
    // would hide the one control they were reaching for.
    another: function () { _beat.pending = ''; _beat.focus = ''; _beat.unsure = false; render(); },
    // MODE B's control, and a different act entirely: fold the starter row in
    // or out underneath the library. One name per meaning.
    add: function () {
      _beat.mode = 'B';
      _beat.adding = !_beat.adding;
      _beat.pending = ''; _beat.focus = '';
      render();
    },
    // THE THIRD POSITION CHANGES THIS LABEL AND NOTHING ELSE. It is the end of
    // the tutorial, so it is the one control that moves the reader to mode B.
    seeAll: function () { _beat.mode = 'B'; _beat.focus = ''; _beat.pending = ''; render(); },
    type: function (v) { _beat.q = String(v == null ? '' : v); paintHits(); },

    search: search,
    render: render,
    beat: beat,
    mode: mode,
    count: count,
    sides: sides,
    countLine: countLine,
    position: positionOf,
    _scope: scopeOf,
    _label: labelOf,
    _seat: openSeat,
    _state: function () { var o = {}; Object.keys(_beat).forEach(function (k) { o[k] = _beat[k]; }); return o; }
  };
  window.PDXStanceStudio = API;

  // ── Boot ──────────────────────────────────────────────────────────────────
  // The URL is read once, before the first paint, so a ?issue= link opens on
  // the question rather than flashing the library first. The store event is
  // how a write made in the every-issue collection below reaches these chips.
  function boot() {
    if (!host()) return;
    readUrl();
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  // The vocabulary and the store both arrive deferred and in no guaranteed
  // order, so the studio settles rather than assuming one paint is enough.
  [250, 900, 2500].forEach(function (ms) { setTimeout(function () { try { if (host()) render(); } catch (e) {} }, ms); });
  try { window.addEventListener('pdx-stances-change', function () { try { render(); } catch (e) {} }); } catch (e) {}
})();
