/* ═══════════════════════════════════════════════════════════════════════════
   ballot-measures.js — the questions on a reader's ballot, beside the seats
   ────────────────────────────────────────────────────────────────────────────
   The ballot workspace listed every seat and no measure, so a Utah voter worked
   six seats and never saw the two constitutional amendments printed on the same
   ballot. This file names the measures a reader's LOCATION puts on their ballot,
   one short entry each, under the seat desk.

   WHAT DECIDES WHAT APPEARS. The saved location, and nothing else: the reader's
   state from window._currentVoterLocation. Residency verification and
   membership are separate doors — they change who may post in a district room,
   never what is on a ballot — and this file reads neither.

   WHAT AN ENTRY SAYS, AND WHERE EACH PART COMES FROM.
     · the name, the official question word for word, and the ballot page    → MEASURES below
     · the topics                → bill-official.json `effects` for the measure's
                                   own record (sitting|number), labelled through
                                   window._issueLabel
     · the plain-language note   → vr_measures.summary, read through
                                   /api/voting-record/measure-ref — the same column
                                   the bill page prints. Nothing is composed here;
                                   a summary that only restates the title is none.
     · History                   → bill-official.json `same`: when the measure's
                                   text was voted on more than once, a link to the
                                   bill page's History fold (#history), with the count.
   A measure with no mapped record says so, in the same words the bill page uses
   for a missing summary. No score, no direction, no match, no party.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MOUNT_ID = 'bw-measures';
  var OFFICIAL_SRC = '/bill-official.json';
  var REF_API = '/api/voting-record/measure-ref/';
  var GAP_SUMMARY = 'No plain-language summary on file yet';
  var GAP_TOPICS = 'No topics mapped to this measure yet';
  // A note on a ballot is a note. A summary longer than this is a chapter, and
  // stays on the bill page whole rather than being cut here.
  var NOTE_MAX = 600;

  // Every measure this file can place, by the state that votes on it. `record`
  // is the measure's own address in the archive; whether that address is mapped
  // is read from the data at run time, never asserted here.
  var MEASURES = [
    {
      id: 'ut-amendment-a', state: 'UT', election: '2026-11-03',
      label: 'Constitutional Amendment A',
      what: 'How proposed constitutional amendments are published',
      page: '/ballot/ut-amendment-a',
      record: { sitting: '2025GS', number: 'H.J.R. 10' },
      question: 'Shall the Utah Constitution be amended to change how proposed constitutional amendments are published, requiring publication for 60 days immediately before the general election in a manner established by state law instead of in newspapers?'
    },
    {
      id: 'ut-amendment-b', state: 'UT', election: '2026-11-03',
      label: 'Constitutional Amendment B',
      what: 'A 60% vote for citizen initiatives that raise taxes',
      page: '/ballot/ut-amendment-b',
      record: { sitting: '2025GS', number: 'S.J.R. 2' },
      question: 'Shall the Utah Constitution be amended to require that citizen-proposed laws that increase taxes compared to existing law be approved by at least 60% of voters, instead of a simple majority?'
    }
  ];
  var STATE_CODE = { utah: 'UT' };

  var _official = null;      // { effects, same } once bill-official.json lands
  var _officialP = null;
  var _refs = {};            // record key -> { summary, title, shortTitle } | false (looked up, none)
  var _refP = {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function keyOf(m) { return m.record ? m.record.sitting + '|' + m.record.number : ''; }
  function billHref(m) {
    return '/b/' + encodeURIComponent(m.record.sitting) + '/' + encodeURIComponent(m.record.number);
  }
  function issueLabel(k) {
    try { if (typeof window._issueLabel === 'function') { var l = window._issueLabel(k); if (l) return l; } } catch (e) {}
    return String(k).replace(/_/g, ' ');
  }
  function flat(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().toLowerCase(); }

  // ── The location door, and only that door ──────────────────────────────────
  function stateOf() {
    if (!window._hasUserLocation) return '';
    var loc = window._currentVoterLocation || {};
    var s = String(loc.state || loc.stateCode || '').trim();
    if (!s) return '';
    if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
    return STATE_CODE[s.toLowerCase()] || '';
  }
  function forLocation() {
    var st = stateOf();
    if (!st) return [];
    return MEASURES.filter(function (m) { return m.state === st; });
  }

  // ── The record, read once ──────────────────────────────────────────────────
  function repaint() {
    try {
      var host = document.getElementById(MOUNT_ID);
      if (host) host.innerHTML = inner(forLocation());
    } catch (e) {}
  }
  function loadOfficial() {
    if (_officialP) return _officialP;
    if (typeof fetch !== 'function') { _official = { effects: {}, same: null }; return (_officialP = Promise.resolve(_official)); }
    _officialP = fetch(OFFICIAL_SRC, { headers: { accept: 'application/json' } })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (d) { _official = { effects: (d && d.effects) || {}, same: (d && d.same) || null }; })
      .catch(function () { _official = { effects: {}, same: null }; })
      .then(function () { loadRefs(); repaint(); return _official; });
    return _officialP;
  }
  function topicsOf(m) {
    var e = _official && _official.effects && _official.effects[keyOf(m)];
    return e ? Object.keys(e) : [];
  }
  function familyOf(m) {
    var st = _official && _official.same;
    var fid = st && st.byMeasure && st.byMeasure[keyOf(m)];
    return (fid && st.families && st.families[fid]) || null;
  }
  // A measure is MAPPED when the record holds topics for it. Only those are
  // asked for a summary: an unmapped measure has no archive row to ask about.
  function loadRefs() {
    forLocation().forEach(function (m) {
      var k = keyOf(m);
      if (!k || _refP[k] || !topicsOf(m).length || typeof fetch !== 'function') return;
      _refP[k] = fetch(REF_API + encodeURIComponent(m.record.sitting) + '/' + encodeURIComponent(m.record.number),
        { headers: { accept: 'application/json' } })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (d) { _refs[k] = (d && d.measure) || false; })
        .catch(function () { _refs[k] = false; })
        .then(repaint);
    });
  }
  // What the archive holds as a description, or ''. A field that is only the
  // measure's own name is none, as on the bill page.
  function summaryOf(m) {
    var r = _refs[keyOf(m)];
    if (!r) return '';
    var s = r.summary != null ? String(r.summary).trim() : '';
    if (!s) return '';
    var f = flat(s);
    if (f === flat(r.title) || f === flat(r.shortTitle)) return '';
    return s;
  }

  // ── One entry ──────────────────────────────────────────────────────────────
  function entryHtml(m) {
    var k = keyOf(m);
    var loaded = !!_official;
    var topics = loaded ? topicsOf(m) : [];
    var mapped = topics.length > 0;
    var pending = !loaded || (mapped && !Object.prototype.hasOwnProperty.call(_refs, k));
    var out = '<li class="bw-m" data-bw-measure="' + esc(m.id) + '"' + (mapped ? ' data-mapped="1"' : '') + '>' +
      '<div class="bw-m-hd">' +
        '<a class="bw-m-name" href="' + esc(m.page) + '">' + esc(m.label) + '</a>' +
        '<span class="bw-m-what">' + esc(m.what) + (m.record ? ' · ' + esc(m.record.number) : '') + '</span>' +
      '</div>' +
      '<p class="bw-m-q" data-bw-m-question>“' + esc(m.question) + '”</p>';

    if (!loaded) {
      out += '<p class="bw-m-gap" data-bw-m-pending>Checking the record for this measure…</p>';
    } else if (mapped) {
      out += '<ul class="bw-m-topics" data-bw-m-topics aria-label="Topics">' +
        topics.map(function (t) { return '<li class="bw-m-topic" data-issue="' + esc(t) + '">' + esc(issueLabel(t)) + '</li>'; }).join('') +
        '</ul>';
    } else {
      out += '<p class="bw-m-gap" data-bw-m-gap="topics">' + GAP_TOPICS + '.</p>';
    }

    if (loaded && !pending) {
      var s = mapped ? summaryOf(m) : '';
      if (s && s.length <= NOTE_MAX) {
        out += '<p class="bw-m-sum" data-bw-m-summary>' + esc(s) + '</p>';
      } else if (s) {
        out += '<p class="bw-m-gap" data-bw-m-summary-long>The summary on file is long; it is on the ' +
          '<a href="' + esc(billHref(m)) + '">bill page</a> in full.</p>';
      } else {
        out += '<p class="bw-m-gap" data-bw-m-gap="summary">' + GAP_SUMMARY + '.</p>';
      }
    }

    var fm = loaded ? familyOf(m) : null;
    if (fm && fm.members && fm.members.length > 1) {
      out += '<a class="bw-m-hist" data-bw-m-history href="' + esc(billHref(m)) + '#history">' +
        'History · the same text was voted on ' + fm.members.length + ' times <span aria-hidden="true">›</span></a>';
    }
    var links = '<a class="bw-m-go" href="' + esc(m.page) + '">This measure’s page <span aria-hidden="true">›</span></a>';
    if (mapped) links += '<a class="bw-m-go" data-bw-m-record href="' + esc(billHref(m)) + '">The record <span aria-hidden="true">›</span></a>';
    return out + '<div class="bw-m-links">' + links + '</div></li>';
  }

  function inner(list) {
    return '<h4 class="bw-m-title" id="bw-measures-h">Measures on your ballot</h4>' +
      '<p class="bw-m-sub">Statewide questions your location puts on the ballot. Each one is a yes or no; ' +
      'read the official wording and what a yes and a no each do on its ballot page.</p>' +
      '<ul class="bw-m-list">' + list.map(entryHtml).join('') + '</ul>';
  }

  // The workspace calls this inside its own paint. No location, or a state with
  // no measure on file, paints nothing — the official-ballot note above the
  // desk already says this workspace is not the whole printed ballot.
  function html() {
    var list = forLocation();
    if (!list.length) return '';
    loadOfficial();
    return '<section class="bw-measures" id="' + MOUNT_ID + '" data-bw-measures aria-labelledby="bw-measures-h">' +
      inner(list) + '</section>';
  }

  window.PDXBallotMeasures = {
    html: html,
    forLocation: forLocation,
    ready: function () { return loadOfficial().then(function () {
      var ks = Object.keys(_refP).map(function (k) { return _refP[k]; });
      return Promise.all(ks);
    }); },
    _measures: MEASURES
  };
})();
