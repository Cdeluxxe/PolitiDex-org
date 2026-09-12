/* ─────────────────────────────────────────────────────────────────────────────
   district-voice.js — District Voice, slice 1: the belonging layer on a seat file
   ─────────────────────────────────────────────────────────────────────────────
   THE PLACE, NOT A PROFILE. This module paints the top of /d/<seatKey>: one live
   question a verified neighbour in that seat can answer, the short takes those
   neighbours have posted, and the seat's latest formal act on the question's
   issue. It hangs off a SEAT and never off a pid — there is no politician id in
   any request this file sends or any row it writes, so a take cannot become a
   comment on a person even if the seat changes hands tomorrow.

   NOT A SCORE, NOT A THIRD MATCH, NOT A COMMENT SECTION. The poll prints one
   integer per option and the number of people who answered. There is no
   percentage in this file — none is computed and none is rendered — no bar, no
   fill, no ring, no leader, no winner and no composite. A proportion drawn as a
   length reads as a grade, and a neighbour's answer is not a grade. Nothing here
   reads or writes Direction Match, Word vs Action, the finance lane, a stance, a
   formal act or a baseline: the ONE record read below is the same public
   /api/voting-record GET any signed-out reader can make, and it is read-only.

   NO PARTY, ANYWHERE. No party letter, no party colour, no caucus, no team
   language, no "loyalty" and no sort that party could reach. Takes are NEWEST
   FIRST and that is the only order — there is no sort control, because a feed
   with an order knob is a leaderboard with a conversation's manners. No upvote,
   no like, no reaction, no reply box: slice 2 owns threads and this file cannot
   express one.

   ── READING IS OPEN. WRITING IS RESIDENCY-GATED. ───────────────────────────
   The public record stays free and ungated. A signed-out visitor with no
   account, no location and no residency sees the question, the counts, every
   take and the record strip — the GET below carries no Authorization header when
   there is nobody to mint one for, and there is no branch that hides a block
   behind sign-in. What is gated is the two WRITES.

   THE COMPOSER IS THE SERVER'S ANSWER, NOT THIS FILE'S OPINION. Whether a reader
   may post or answer is decided in netlify/lib/district-voice-core.mjs and
   returned by /api/district-voice as `voice.canPost` plus the sentence to print
   when it is false. This module RENDERS that answer and never computes one: a UI
   that decides for itself who may type is a UI that will eventually disagree
   with the gate. There is no branch below that opens the composer on anything
   other than canPost === true, and the server re-runs the same check on the
   write regardless of what got painted.

   THE CLAIM IS THE READER'S OWN SAVED BALLOT LOCATION. claim() below reads the
   county and state house district the reader already chose — through
   pdxRepsForMe(), the app's one resolver, so this file does not become a second
   answer about where somebody lives — and sends those three fields with the
   read and with every write. The server checks them for CONSISTENCY (a county it
   maps, and a house district that county actually contains) and matches them
   against this seat. That is not an identity check and this file never calls it
   one. Fail closed: no location means read-only, and the sentence says why.

   NO IDENTITY VENDOR IS LIVE. verify() below is the seam Stripe Identity or
   Veriff lands in. It is called by nothing in this repo, performs no upload, no
   third-party round trip and NO CHARGE, and it REJECTS rather than resolving
   false — so wiring a vendor in is a deliberate act and never an accident that
   quietly verifies somebody.

   HONEST EMPTY. Zero takes is a sentence. Zero verified neighbours is a
   sentence. No formal act on the question's issue is a sentence. None of the
   three is a placeholder row, a skeleton, a sample take or a seeded feed — a
   fake feed in a place that is supposed to prove neighbours are real is the one
   lie this whole slice exists to avoid.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var API = '/api/district-voice';
  var RECORD_API = '/api/voting-record/member/';

  // The canonical seat key, and the alias. `ut-hd-68` is 'ut-statehouse-68'
  // written short — one place, one row, two spellings, NO SECOND DISTRICT MAP.
  // Mirrored from netlify/lib/district-voice-core.mjs rather than imported
  // because this file is loaded as a plain script; the suite asserts the two
  // agree on the same strings.
  var SEAT_KEY_RE = /^[a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*$/;
  var ALIAS_RE = /^([a-z]{2})-(hd|sd|cd)-([1-9][0-9]*)$/;
  var ALIAS_CHAMBERS = { hd: 'statehouse', sd: 'statesenate', cd: 'house' };

  // THE WHOLE ALLOW-LIST. Adding a seat is adding a line.
  var VOICE_SEATS = { 'ut-statehouse-68': 1 };

  var TAKE_MAX = 280;
  var TAKES_CAP = 20;

  var COPY = {
    kick: 'District Voice',
    // REQUIRED ON THE FILE, verbatim. Rendered unconditionally by render(), so
    // the block cannot paint without it.
    frame: 'Verified neighbors. Not a poll of the internet. Not how the member voted.',
    pollHd: 'One live question',
    pollCounts: 'Answers so far',
    takesHd: 'Neighbor takes',
    takesNote: 'Newest first. One short take, keyed to an issue this seat touches.',
    weekHd: 'This week',
    // Three states, three sentences. See netlify/lib/district-voice-core.mjs,
    // which owns these strings; {issue} is filled here with the issue's printed
    // label, because the label lives in this file's issue vocabulary.
    weekBusy: 'Checking this seat\u2019s formal record on {issue}\u2026',
    weekNone: 'The record holds no formal act on {issue} for this seat.',
    weekUnread: 'We could not read this seat\u2019s formal record just now.',
    emptyTakes: 'No takes yet. Nobody has posted in this seat.',
    emptyNeighbors: 'No verified neighbors in this seat yet.',
    // THE ONE SENTENCE A ZERO-ANSWER QUESTION GETS. Three zeroes, "no answers"
    // and "no verified neighbors" stacked under one question were three ways of
    // saying nothing, and a reader had to read all three to learn it once. See
    // pollHtml() for which two stopped being printed.
    emptyAnswers: 'No answers yet.',
    busy: 'Reading this seat…',
    gone: 'We could not reach this seat’s Voice.',
    composeHd: 'Post a take',
    composePh: 'One short take, in your own words.',
    composeIssue: 'Issue',
    send: 'Post',
    sending: 'Posting…',
    sent: 'Posted.',
    answerSent: 'Answer recorded.',
    signIn: 'Sign in and set your ballot location to post here. Reading stays open.'
  };

  function fn(x) { return typeof x === 'function'; }
  // ── THE ISSUE'S OWN COLOUR, BORROWED AND NEVER INVENTED ───────────────────
  // PDXIssueColors is the app's one answer to "what colour is this issue", and
  // it hands back the whole ` data-ic="on" style="--pdx-ic:…"` fragment ready to
  // drop inside an opening tag. A key that lands on no Core National Issue gets
  // an EMPTY fragment by that module's own design, and a boot without the module
  // gets one too — so the rail is a recognition aid that is simply absent when
  // there is nothing to recognise, never a neutral slate pretending to be one.
  //
  // A COLOUR IS NOT A VERDICT. It says "this is the lands take", never "this
  // take is right". Nothing downstream reads it, and no rule in the sheet lets a
  // count reach it.
  function icAttr(key) {
    try {
      var C = window.PDXIssueColors;
      if (!C || !fn(C.skin)) return '';
      var sk = C.skin(String(key == null ? '' : key), window.PDXIssueFamily);
      return (sk && sk.attr) ? String(sk.attr) : '';
    } catch (e) { return ''; }
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }

  // ── THE ADDRESS ───────────────────────────────────────────────────────────
  // Every spelling in, ONE spelling out. Every caller starts here, so an alias
  // never reaches a request and the server only ever sees the canonical key.
  function normalizeSeatKey(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    if (!s) return '';
    if (SEAT_KEY_RE.test(s)) return s;
    var m = ALIAS_RE.exec(s);
    if (!m) return '';
    var chamber = ALIAS_CHAMBERS[m[2]];
    if (!chamber) return '';
    var out = m[1] + '-' + chamber + '-' + m[3];
    return SEAT_KEY_RE.test(out) ? out : '';
  }
  function isAlias(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    return !!s && !SEAT_KEY_RE.test(s) && !!normalizeSeatKey(s);
  }
  // Does this seat have a Voice? The one question the chrome asks before it
  // prints a control pointing here.
  function shipped(seatKey) {
    var k = normalizeSeatKey(seatKey);
    return !!k && Object.prototype.hasOwnProperty.call(VOICE_SEATS, k);
  }
  function path(seatKey) {
    var k = normalizeSeatKey(seatKey);
    return shipped(k) ? '/d/' + k : '';
  }
  function seatNumber(seatKey) {
    var k = normalizeSeatKey(seatKey);
    var m = /-([0-9]+)$/.exec(k);
    return m ? m[1] : '';
  }

  // ── THE VENDOR SEAM, AND IT IS UNUSED ─────────────────────────────────────
  // Stripe Identity / Veriff land here. Called by nothing in this repo: there is
  // no upload, no third-party round trip and NO CHARGE in this pass. It REJECTS
  // rather than resolving false so that wiring a vendor in has to be deliberate.
  function verify() {
    return Promise.reject(new Error('district-voice: no identity vendor is wired in this pass'));
  }

  // ── THE CALLER ────────────────────────────────────────────────────────────
  // Firebase's own handle, and NEVER an anonymous one: an anonymous session is a
  // browser, not a neighbour, and a per-browser uid must not be able to hold a
  // seat's residency.
  function fbAuth() {
    try { if (window.auth) return window.auth; } catch (e) {}
    return null;
  }
  function tokenUser() {
    var a = fbAuth();
    var cu = a && a.currentUser;
    if (!cu || cu.isAnonymous === true || !fn(cu.getIdToken)) return null;
    return cu;
  }
  // Resolves a token, or null when there is nobody to mint one for AND when the
  // mint itself fails. Null is not "signed out" to the caller — it just means the
  // request goes out unauthenticated, which for a READ is the normal case.
  function bearer(fresh) {
    var u = tokenUser();
    if (!u) return Promise.resolve(null);
    try {
      return Promise.resolve(u.getIdToken(!!fresh)).then(
        function (t) { return t || null; },
        function () { return null; }
      );
    } catch (e) { return Promise.resolve(null); }
  }

  function call(suffix, opts, fresh) {
    var o = opts || {};
    return bearer(fresh).then(function (t) {
      var headers = { 'Accept': 'application/json' };
      if (o.body) headers['Content-Type'] = 'application/json';
      if (t) headers['Authorization'] = 'Bearer ' + t;
      return fetch(API + (suffix || ''), {
        method: o.method || 'GET',
        headers: headers,
        body: o.body ? JSON.stringify(o.body) : undefined
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data || {} };
        });
      });
    }).catch(function () { return { ok: false, status: 0, data: {} }; });
  }

  // One retry, and only on a 401 for a reader we DO hold a handle for: that is a
  // stale token rather than a signed-out reader, so we mint a fresh one and ask
  // exactly once more instead of printing the signed-out sentence at somebody who
  // is signed in.
  function api(suffix, opts) {
    return call(suffix, opts, false).then(function (res) {
      if (res.status !== 401 || !tokenUser()) return res;
      return call(suffix, opts, true);
    });
  }

  // ── THE CLAIM ─────────────────────────────────────────────────────────────
  // The reader's OWN saved ballot location, read through pdxRepsForMe() — the
  // app's one resolver — so this file never becomes a second answer about where
  // somebody lives. Three fields, and they are the same three on the read and on
  // every write, so the claim that painted the composer is the claim the write is
  // judged on.
  //
  // Returns {} when there is no location. That is the fail-closed case and it is
  // sent as nothing rather than as a guess.
  function claim() {
    var out = { state: '', county: '', houseDistrict: '' };
    var loc = null;
    try { loc = window._currentVoterLocation || null; } catch (e) { loc = null; }
    var reps = null;
    try { reps = fn(window.pdxRepsForMe) ? window.pdxRepsForMe() : null; } catch (e) { reps = null; }

    out.state = String((reps && reps.state) || (loc && loc.state) || '');
    // The county the curated area resolved to, published by the resolver for
    // exactly this reason. _currentVoterLocation is the fallback, not the source.
    out.county = String((reps && reps.county) || (loc && loc.county) || '');

    var n = '';
    try {
      var levels = (reps && reps.levels) || [];
      for (var i = 0; i < levels.length; i++) {
        var lv = levels[i];
        if (lv && !lv.statewide && String(lv.seat || lv.key) === 'statehouse' && lv.district != null) {
          n = String(lv.district).replace(/[^0-9]/g, '');
          break;
        }
      }
    } catch (e) {}
    if (!n && loc) n = String(loc.stateHouseDistrict == null ? '' : loc.stateHouseDistrict).replace(/[^0-9]/g, '');
    out.houseDistrict = n;

    if (!out.state || !out.county || !out.houseDistrict) return {};
    return out;
  }

  function claimQuery() {
    var c = claim();
    var parts = [];
    if (c.state) parts.push('state=' + encodeURIComponent(c.state));
    if (c.county) parts.push('county=' + encodeURIComponent(c.county));
    if (c.houseDistrict) parts.push('houseDistrict=' + encodeURIComponent(c.houseDistrict));
    return parts.length ? '&' + parts.join('&') : '';
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  // THE POLL, AND IT IS THE LOUDEST THING ON THE PAGE. The question is set in the
  // app's display face at display size and every label around it is a kicker, so
  // a reader arriving cold reads the question first and the furniture second.
  // That is the whole of the hierarchy: nothing else on this seat competes with
  // it, and the sheet gives the three choices the only cards in the block.
  //
  // COUNTS ONLY, AND ONLY WHEN THERE IS ONE. One integer per option, printed as
  // an integer beside the option's own words. Deliberately NOT a bar, a ring, a
  // share or a proportion: this file computes no denominator, so there is nothing
  // here a reader could mistake for a mandate. The reader's own answer is marked,
  // and answering again replaces it rather than adding one.
  //
  // A ZERO IS NOT A RESULT, SO A ZERO IS NOT PRINTED. This block used to stack
  // three statements under an unanswered question — a nought beside all three
  // options, "Answers so far: No answers yet." and "No verified neighbors in this
  // seat yet." — which is three ways of saying the same nothing, and it made an
  // empty question look like a finished one with everybody at zero. Now the
  // count rides an option only when somebody has picked it, the tally sentence
  // is printed only when somebody has answered, and the neighbour headcount is
  // printed only when there is a neighbour to count. At zero the question gets
  // ONE sentence. Nothing was softened to get there: the sentence still refuses
  // to imply completeness, and every number that exists is still printed whole.
  function pollHtml(seatKey, payload) {
    var poll = payload && payload.poll;
    if (!poll) return '';
    var copy = (payload && payload.copy) || {};
    var canPost = !!(payload.voice && payload.voice.canPost);
    var opts = (poll.options || []).map(function (o) {
      var mine = poll.myAnswer && String(poll.myAnswer) === String(o.optionKey);
      var n = Number(o.count || 0);
      var inner =
        '<span class="pdxv-optlabel">' + esc(o.label) + '</span>' +
        (n > 0 ? '<span class="pdxv-optcount">' + esc(String(n)) + '</span>' : '');
      // A reader who cannot answer still SEES every option and every count.
      // Being told the numbers and told plainly why you are not in them is more
      // honest than hiding them.
      if (!canPost) {
        return '<li class="pdxv-opt' + (mine ? ' is-mine' : '') + '">' +
          '<span class="pdxv-optrow">' + inner + '</span></li>';
      }
      return '<li class="pdxv-opt' + (mine ? ' is-mine' : '') + '">' +
        '<button type="button" class="pdxv-optbtn" data-pdxv-answer="' + esc(o.optionKey) + '"' +
          (mine ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
          inner + '</button></li>';
    }).join('');

    // The tally is the gate's own sentence or it is the gate's own empty — this
    // file composes neither and prints exactly one of them.
    var tally = poll.answered
      ? '<p class="pdxv-countline">' + esc(copy.pollCounts || COPY.pollCounts) + ': ' +
          esc(String(poll.countLine || '')) + '</p>'
      : '<p class="pdxv-pollempty">' + esc(copy.emptyAnswers || COPY.emptyAnswers) + '</p>';

    // THE HEADCOUNT IS AN INTEGER OR IT IS ABSENT. A verified neighbour is a
    // real fact worth printing; zero of them under a question nobody has
    // answered is the same nothing the sentence above already said.
    var nbrs = payload.neighbors || null;
    var verified = Number((nbrs && nbrs.verified) || 0);
    var nbrLine = (verified > 0 && nbrs && nbrs.line)
      ? '<p class="pdxv-neighbors">' + esc(String(nbrs.line)) + '</p>'
      : '';

    return '<div class="pdxv-poll">' +
      '<p class="pdxv-blockhd">' + esc(copy.pollHd || COPY.pollHd) + '</p>' +
      '<p class="pdxv-q">' + esc(poll.question) + '</p>' +
      '<ul class="pdxv-opts">' + opts + '</ul>' +
      tally + nbrLine +
    '</div>';
  }

  // THE TAKES. Newest first, twenty, no identifier of who wrote one and no reply
  // box. A take carries the issue it is keyed to and nothing that could rank it:
  // there is no upvote, no like, no reaction and no order knob, so the only thing
  // one take has that another does not is having been posted later.
  //
  // THE RAIL IS THE ISSUE'S OWN COLOUR. Every take already named its issue in
  // words; the left edge now carries that issue's colour from the app's one
  // colour module, so a stack of takes reads as a stack of subjects at a glance
  // instead of as one undifferentiated column. Not a tier, not a temperature and
  // not a verdict — see icAttr(), and see the sheet for the rule that nothing on
  // a take may vary with anything except which issue it is about.
  //
  // ZERO TAKES IS A DASHED WELL WITH ONE SENTENCE IN IT, and — for a reader who
  // cannot post — the server's own sentence about why, in the same well. The
  // dashes are the point: a solid card with nothing in it reads as a thing that
  // failed to load, and a well that is visibly an outline reads as a space
  // nobody has filled yet, which is exactly what it is. Never a placeholder row,
  // never a skeleton and never a sample take.
  function takesHtml(payload, noteInWell) {
    var takes = (payload && payload.takes) || [];
    var copy = (payload && payload.copy) || {};
    var list;
    if (takes.length) {
      list = '<ul class="pdxv-takes">' + takes.map(function (t) {
        return '<li class="pdxv-take' + (t.mine ? ' is-mine' : '') + '"' +
            icAttr(t.issueKey) + '>' +
          '<span class="pdxv-takeissue">' + esc(issueLabel(t.issueKey)) + '</span>' +
          '<span class="pdxv-takebody">' + esc(t.body) + '</span>' +
        '</li>';
      }).join('') + '</ul>';
    } else {
      var voice = (payload && payload.voice) || {};
      list = '<div class="pdxv-well">' +
        '<p class="pdxv-empty">' + esc(copy.emptyTakes || COPY.emptyTakes) + '</p>' +
        (noteInWell
          ? '<p class="pdxv-closed">' + esc(voice.note || COPY.signIn) + '</p>'
          : '') +
      '</div>';
    }
    return '<div class="pdxv-takesblock">' +
      '<p class="pdxv-blockhd">' + esc(copy.takesHd || COPY.takesHd) + '</p>' +
      '<p class="pdxv-blocknote">' + esc(copy.takesNote || COPY.takesNote) + '</p>' +
      list +
    '</div>';
  }

  // THE COMPOSER. Painted on `canPost === true` and on nothing else. When it is
  // false the server's own sentence is printed in its place — this file writes no
  // refusal copy of its own, so the page and the gate cannot say different things.
  //
  // AND IT IS SAID ONCE. When there are no takes the refusal has already been
  // printed inside the empty well, beside the sentence it explains — that is the
  // one place on an empty seat where "nobody has posted" and "here is why you
  // cannot" belong together. `noteInWell` is render()'s answer to which of the
  // two slots got it, so the sentence is never printed twice and never dropped.
  function composerHtml(payload, noteInWell) {
    var voice = (payload && payload.voice) || {};
    if (voice.canPost !== true) {
      return noteInWell
        ? ''
        : '<p class="pdxv-closed">' + esc(voice.note || COPY.signIn) + '</p>';
    }
    var keys = issueChoices(payload);
    var opts = keys.map(function (k) {
      return '<option value="' + esc(k) + '">' + esc(issueLabel(k)) + '</option>';
    }).join('');
    return '<div class="pdxv-composer">' +
      '<p class="pdxv-blockhd">' + esc(COPY.composeHd) + '</p>' +
      '<label class="pdxv-clabel" for="pdxv-issue">' + esc(COPY.composeIssue) + '</label>' +
      '<select id="pdxv-issue" class="pdxv-select">' + opts + '</select>' +
      '<textarea id="pdxv-body" class="pdxv-body" maxlength="' + TAKE_MAX + '"' +
        ' placeholder="' + esc(COPY.composePh) + '"></textarea>' +
      '<div class="pdxv-crow">' +
        '<button type="button" class="pdxv-send" data-pdxv-send="1">' + esc(COPY.send) + '</button>' +
        '<span class="pdxv-count" id="pdxv-count">0 / ' + TAKE_MAX + '</span>' +
      '</div>' +
      '<p class="pdxv-say" id="pdxv-say" role="status"></p>' +
    '</div>';
  }

  // The issue keys a take may be keyed to: the poll's key, plus the keys this
  // seat's member actually has a formal record on. Every one of them is an
  // ISSUE_MAP key that came from the server — this file invents none, and the
  // server refuses any key that is not in the vocabulary regardless.
  function issueChoices(payload) {
    var out = [];
    var seen = {};
    var push = function (k) {
      var s = String(k == null ? '' : k).trim().toLowerCase();
      if (!s || seen[s]) return;
      seen[s] = 1;
      out.push(s);
    };
    if (payload && payload.poll && payload.poll.issueKey) push(payload.poll.issueKey);
    (_recordKeys || []).forEach(push);
    return out;
  }

  // THE RECORD STRIP. The seat's latest formal act on the question's issue, read
  // from the SAME public voting-record GET any signed-out reader can make. It is
  // read-only and one-way: nothing in this module writes, scores, re-dates or
  // reinterprets a formal act, and no take or answer touches it. When the record
  // holds nothing on that issue the strip says so — which is a fact about the
  // record, not a gap this file papers over.
  //
  // AND IT HAS THREE STATES, WHICH IS THE WHOLE POINT. The read can be out, it
  // can land on an empty record, and it can fail — and one sentence for all three
  // is the defect this replaces: the strip printed "no formal act … in the current
  // record" the instant the block painted, before anything had been asked, and
  // the wording made that read like a fetch still on its way. So:
  //   busy   — the record read is genuinely in flight. Said once, and it goes
  //            away, because every branch below repaints.
  //   act    — an act is on file, and it is printed as a link to its source.
  //   none   — the read landed and the record holds nothing on this issue. A
  //            final sentence naming the issue, with no "yet" and no "checking".
  //            This is HD-68's real answer today: the seat has no formal act on
  //            the poll's issue, and the strip says exactly that.
  //   unread — the read could not be made or did not come back. Its own sentence,
  //            because "we did not look" is not "there is nothing".
  //
  // ONE ISSUE, ONE QUESTION. The strip is keyed to the poll's issue and to
  // nothing else — no fallback key, no nearest neighbour, no invented mapping. An
  // act that came back on some other key is dropped rather than printed, because
  // a strip quietly answering a different question than the poll above it is
  // worse than an empty strip that names its question.
  function weekFill(tpl) {
    var issue = _payload && _payload.poll && _payload.poll.issueKey;
    return String(tpl == null ? '' : tpl)
      .replace(/\{issue\}/g, issueLabel(issue || ''));
  }

  function weekSentence(state) {
    var copy = (_payload && _payload.copy) || {};
    if (state === 'busy') return weekFill(copy.weekBusy || COPY.weekBusy);
    if (state === 'unread') return weekFill(copy.weekUnread || COPY.weekUnread);
    return weekFill(copy.weekNone || COPY.weekNone);
  }

  // AN ACT IS A BLOCK. NO ACT IS A FOOTNOTE. This is the one asymmetry in the
  // whole module and it is deliberate. When the record holds a formal act on the
  // question's issue, that act is a real thing a reader should be able to see and
  // open, so it gets a heading, the measure's own NUMBER, its title, its date and
  // a door to the record's own source. When the record holds nothing, the honest
  // sentence is still printed — it is never removed and never softened — but it
  // is printed as one quiet line under the question rather than as a third
  // full-weight section peering at the reader. A sentence that says "there is
  // nothing here" should not be the same size as a sentence that says what
  // happened; giving them equal billing is what made this page read as a stack of
  // equal-weight paragraphs in the first place.
  //
  // THE NUMBER IS THE MEASURE'S OWN. H.B. 256, S.B. 187 — the string the record
  // lane already publishes on the item, printed beside the title rather than
  // instead of it, because a reader who recognises the number and a reader who
  // recognises the subject are two different readers and neither one should have
  // to open the link to find out.
  function weekHtml() {
    var copy = (_payload && _payload.copy) || {};
    var act = _weekState === 'act' ? _week : null;
    if (act) {
      return '<div class="pdxv-week">' +
        '<p class="pdxv-blockhd">' + esc(copy.weekHd || COPY.weekHd) + '</p>' +
        '<a class="pdxv-weeklink" href="' + esc(act.href || '#') + '"' +
          (act.href ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
          '<span class="pdxv-weekid">' +
            (act.number ? '<span class="pdxv-weeknum">' + esc(act.number) + '</span>' : '') +
            '<span class="pdxv-weektitle">' + esc(act.title) + '</span>' +
          '</span>' +
          (act.date ? '<span class="pdxv-weekdate">' + esc(act.date) + '</span>' : '') +
        '</a>' +
      '</div>';
    }
    return '<p class="pdxv-week pdxv-week--quiet"' +
        (_weekState === 'busy' ? ' role="status"' : '') + '>' +
      '<span class="pdxv-weekkick">' + esc(copy.weekHd || COPY.weekHd) + '</span>' +
      '<span class="pdxv-weekline">' + esc(weekSentence(_weekState)) + '</span>' +
    '</p>';
  }

  function issueLabel(key) {
    var k = String(key == null ? '' : key);
    try {
      var M = window.ISSUE_MAP;
      if (M && M[k] && M[k].label) return String(M[k].label);
    } catch (e) {}
    return k.replace(/_/g, ' ');
  }

  // THE WHOLE BLOCK, in the order the brief sets: the live question, the
  // neighbours' takes, then the seat's latest formal act. The frame line is
  // rendered unconditionally above all three.
  function render(seatKey, payload) {
    var p = payload || {};
    var copy = p.copy || {};
    // WHICH SLOT HOLDS THE REFUSAL. On an empty seat the "you cannot post here"
    // sentence belongs in the well beside "nobody has posted here"; anywhere else
    // it belongs where the composer would have been. One answer, computed once,
    // so the two renderers below cannot both print it or both skip it.
    var noteInWell = !((p.takes || []).length) && (p.voice || {}).canPost !== true;
    return '<section class="pdxv" data-pdxv-seat="' + esc(normalizeSeatKey(seatKey)) + '">' +
      '<p class="pdxv-kick">' + esc(copy.kick || COPY.kick) + '</p>' +
      '<p class="pdxv-frame">' + esc(copy.frame || COPY.frame) + '</p>' +
      pollHtml(seatKey, p) +
      takesHtml(p, noteInWell) +
      composerHtml(p, noteInWell) +
      weekHtml() +
    '</section>';
  }

  // ── STATE ─────────────────────────────────────────────────────────────────
  var _seat = '';
  var _payload = null;
  var _mountId = '';
  var _recordKeys = [];
  var _week = null;
  // 'busy' | 'act' | 'none' | 'unread'. Starts busy because a fresh mount has a
  // read coming; every exit from loadWeek() moves it off busy, so the strip can
  // never be left saying it is still checking.
  var _weekState = 'busy';
  var _sending = false;

  function mountEl() { return _mountId ? el(_mountId) : null; }

  function repaint() {
    var host = mountEl();
    if (!host || !_seat || !_payload) return;
    try { host.innerHTML = render(_seat, _payload); } catch (e) {}
  }

  function say(msg) {
    var n = el('pdxv-say');
    if (n) { try { n.textContent = String(msg || ''); } catch (e) {} }
  }

  // ── LOAD ──────────────────────────────────────────────────────────────────
  // One GET for the seat, then one BEST-EFFORT record read for the strip. The
  // Voice blocks paint as soon as the first returns rather than behind the second,
  // so a neighbour never waits on the record to see the question — and a record
  // read that fails leaves the strip's honest sentence rather than an error.
  function mount(seatKey, mountId, recordKeys) {
    var k = normalizeSeatKey(seatKey);
    if (!shipped(k)) return false;
    _seat = k;
    _mountId = String(mountId || '');
    _payload = null;
    _week = null;
    _weekState = 'busy';
    if (Array.isArray(recordKeys)) _recordKeys = recordKeys.slice();

    var host = mountEl();
    if (host) {
      try {
        host.innerHTML = '<p class="pdxv-busy" role="status">' + esc(COPY.busy) + '</p>';
      } catch (e) {}
    }
    load();
    return true;
  }

  function load() {
    var k = _seat;
    return api('?seat=' + encodeURIComponent(k) + claimQuery(), { method: 'GET' })
      .then(function (res) {
        if (_seat !== k) return;
        if (!res.ok) {
          var host = mountEl();
          if (host) {
            try {
              host.innerHTML = '<p class="pdxv-empty">' +
                esc((res.data && res.data.error) || COPY.gone) + '</p>';
            } catch (e) {}
          }
          return;
        }
        _payload = res.data;
        repaint();
        loadWeek();
      });
  }

  // The seated member's pid, resolved CLIENT-side from the curated incumbent
  // table Door 2 already ships. It is used for one thing — the public record read
  // for the strip — and it is never sent to /api/district-voice, so no pid ever
  // reaches a voice_* row.
  function seatedPid() {
    try {
      if (!fn(window.pdxSeatedMemberFor)) return '';
      var pid = window.pdxSeatedMemberFor(_seat, seatNumber(_seat));
      return pid ? String(pid) : '';
    } catch (e) { return ''; }
  }

  // EVERY BRANCH SETTLES THE STRIP. There is no path out of this function that
  // leaves _weekState on 'busy', because the one thing the strip must never do is
  // keep saying it is checking when nothing is checking any more. A read that
  // cannot be made, a read that fails, a read that lands empty and a read that
  // lands on an act each set their own state and repaint.
  function settleWeek(k, state, act) {
    if (_seat !== k) return;
    _week = act || null;
    _weekState = state;
    repaint();
  }

  // ── WHICH ISSUES IS THIS ITEM FILED UNDER ─────────────────────────────────
  // A record item spells its issues as a LIST — `issues: [{issueKey, …}]` — and
  // the guard below used to ask only for `it.issueKey`, a field a real item does
  // not carry. So the guard was dead: it read undefined, skipped itself, and the
  // strip printed whatever came back regardless of what it was about. The read is
  // already keyed to one issue so nothing wrong was reaching the page, but a
  // guard that cannot fire is not a guard, and the ONE ISSUE, ONE QUESTION rule
  // above is only true while something enforces it. Both spellings are collected
  // here, so an item shaped either way is checked and neither shape is trusted.
  function itemIssueKeys(it) {
    var out = [];
    var push = function (v) {
      var t = String(v == null ? '' : v).trim().toLowerCase();
      if (t) out.push(t);
    };
    push(it && it.issueKey);
    push(it && it.issue);
    var list = (it && it.issues) || [];
    if (Object.prototype.toString.call(list) === '[object Array]') {
      for (var i = 0; i < list.length; i++) {
        push(list[i] && (list[i].issueKey || list[i].key));
      }
    }
    return out;
  }

  // THE DATE AS A READER READS IT. The record lane publishes an ISO timestamp,
  // and the strip was printing it raw — "2025-03-06T22:11:00.000Z" under a
  // heading that says "This week" is a machine's answer to a human question.
  // Reformatted to the day, in the month's own short name, and NOTHING is
  // recomputed: no timezone is applied, no relative wording is invented, and a
  // string that is not an ISO date is printed exactly as it arrived.
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function actDate(raw) {
    var t = String(raw == null ? '' : raw).trim();
    var m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(t);
    if (!m) return t;
    var mi = Number(m[2]) - 1;
    if (!(mi >= 0 && mi < 12)) return t;
    return MONTHS[mi] + ' ' + String(Number(m[3])) + ', ' + m[1];
  }

  function loadWeek() {
    var k = _seat;
    var issue = _payload && _payload.poll && _payload.poll.issueKey;
    var pid = seatedPid();
    // Nothing to ask, or nobody to ask about. Not an empty record — we never
    // looked — so it says so rather than borrowing the empty's sentence.
    if (!issue || !pid) { settleWeek(k, 'unread', null); return; }
    var url = RECORD_API + encodeURIComponent(pid) +
      '?issue=' + encodeURIComponent(issue) + '&pageSize=1&sort=date';
    fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; })
      .then(function (data) {
        if (_seat !== k) return;
        if (!data) { settleWeek(k, 'unread', null); return; }
        var items = (data && (data.items || data.rows)) || [];
        var it = items[0];
        if (!it) { settleWeek(k, 'none', null); return; }
        // The read was keyed to the poll's issue, so an item on another key is a
        // surprise from the record lane and not something to print under a
        // heading the poll owns.
        var got = itemIssueKeys(it);
        var want = String(issue).trim().toLowerCase();
        if (got.length && got.indexOf(want) < 0) {
          settleWeek(k, 'none', null);
          return;
        }
        var src = it.source || {};
        var act = {
          number: String(it.number || ''),
          title: String(it.title || it.action || ''),
          date: actDate(it.date),
          href: String(src.url || '')
        };
        // An unprintable row is nothing on file, not a broken strip: there is no
        // heading without a title, and inventing one would be inventing an act.
        if (!act.title) { settleWeek(k, 'none', null); return; }
        settleWeek(k, 'act', act);
      });
  }

  // ── WRITES ────────────────────────────────────────────────────────────────
  // Both send the seat and the same three claim fields. Neither trusts what got
  // painted: the server re-runs the whole gate, and a refusal is printed as the
  // server's own sentence.
  function answer(optionKey) {
    var k = _seat;
    var c = claim();
    return api('/poll', {
      method: 'POST',
      body: {
        seat: k, optionKey: String(optionKey || ''),
        state: c.state, county: c.county, houseDistrict: c.houseDistrict
      }
    }).then(function (res) {
      if (_seat !== k) return;
      if (!res.ok) { say((res.data && res.data.error) || COPY.gone); return; }
      if (res.data && res.data.poll && _payload) {
        _payload.poll = res.data.poll;
        repaint();
        say(COPY.answerSent);
      }
    });
  }

  function send() {
    if (_sending) return Promise.resolve();
    var k = _seat;
    var issueNode = el('pdxv-issue');
    var bodyNode = el('pdxv-body');
    var issueKey = issueNode ? String(issueNode.value || '') : '';
    var body = bodyNode ? String(bodyNode.value || '') : '';
    if (!body.trim()) { say('Write something first.'); return Promise.resolve(); }
    _sending = true;
    say(COPY.sending);
    var c = claim();
    return api('/take', {
      method: 'POST',
      body: {
        seat: k, issueKey: issueKey, body: body,
        state: c.state, county: c.county, houseDistrict: c.houseDistrict
      }
    }).then(function (res) {
      _sending = false;
      if (_seat !== k) return;
      if (!res.ok) { say((res.data && res.data.error) || COPY.gone); return; }
      if (bodyNode) { try { bodyNode.value = ''; } catch (e) {} }
      // Re-read rather than splicing the new take in locally, so the feed a
      // neighbour sees after posting is the feed the server actually holds.
      return load().then(function () { say(COPY.sent); });
    }, function () { _sending = false; });
  }

  // ── WIRING ────────────────────────────────────────────────────────────────
  // Delegated once on the document, so a repaint never has to re-bind and a
  // control that is not painted cannot be reached.
  function wire() {
    try {
      document.addEventListener('click', function (ev) {
        var t = ev.target;
        for (var n = t; n && n !== document; n = n.parentNode) {
          if (!n.getAttribute) continue;
          var opt = n.getAttribute('data-pdxv-answer');
          if (opt) { ev.preventDefault(); answer(opt); return; }
          if (n.getAttribute('data-pdxv-send')) { ev.preventDefault(); send(); return; }
        }
      }, false);
      document.addEventListener('input', function (ev) {
        var t = ev.target;
        if (!t || t.id !== 'pdxv-body') return;
        var n = el('pdxv-count');
        if (n) {
          try { n.textContent = String(String(t.value || '').length) + ' / ' + TAKE_MAX; } catch (e) {}
        }
      }, false);
    } catch (e) {}
  }

  // The record issue keys, fed in by the district file once its own best-effort
  // record read lands. It only ever ADDS choices to the composer; the poll's key
  // is always there without it.
  function issues(keys) {
    if (!Array.isArray(keys)) return;
    _recordKeys = keys.slice();
    if (_payload) repaint();
  }

  // ── THE PERSON FILE'S ONE QUIET LINK ──────────────────────────────────────
  // Which Voice seat does this pid SIT IN, if any? Answered by asking the
  // curated incumbent table Door 2 already ships, per seat in the allow-list —
  // so it is the seat that names the member and never the member that names the
  // seat. Returns '' for everybody else, which is almost everybody.
  //
  // THE DIRECTION MATTERS. A person file gets a link TO a place; the place does
  // not get a feed of comments about the person. If Chew leaves the seat the
  // link moves to whoever holds it, and the takes do not follow them — they
  // belong to the district, which is the whole reason Voice is keyed on a seat.
  function seatForPid(pid) {
    var want = String(pid == null ? '' : pid).trim();
    if (!want) return '';
    var keys = Object.keys(VOICE_SEATS);
    for (var i = 0; i < keys.length; i++) {
      try {
        if (!fn(window.pdxSeatedMemberFor)) return '';
        var got = window.pdxSeatedMemberFor(keys[i], seatNumber(keys[i]));
        if (got && String(got) === want) return keys[i];
      } catch (e) {}
    }
    return '';
  }

  // ONE link, and a quiet one. No count on it, no "N neighbors talking", no
  // activity dot and no badge — a number here would turn a neighbour's sentence
  // into a metric on somebody's file, which is the exact thing this slice is
  // built not to do. It says where the place is and nothing about how busy it is.
  function personLinkHtml(pid) {
    var seat = seatForPid(pid);
    var href = path(seat);
    if (!href) return '';
    return '<a class="pf-kick-voice" href="' + esc(href) + '"' +
      ' data-pdxdf-open="' + esc(seat) + '"' +
      ' title="District Voice for this seat: one live question and the verified' +
      ' neighbors\u2019 own takes. Not a comment section on this person, and not' +
      ' how they voted.">Neighbors in this seat</a>';
  }

  window.PDXVoice = {
    API: API,
    SEAT_KEY_RE: SEAT_KEY_RE,
    ALIAS_RE: ALIAS_RE,
    VOICE_SEATS: VOICE_SEATS,
    COPY: COPY,
    TAKE_MAX: TAKE_MAX,
    TAKES_CAP: TAKES_CAP,
    normalizeSeatKey: normalizeSeatKey,
    isAlias: isAlias,
    shipped: shipped,
    path: path,
    claim: claim,
    mount: mount,
    issues: issues,
    // Exposed for the suite: the block's markup for a payload, asserted directly
    // rather than inferred from a live fetch.
    render: render,
    // THE VENDOR SEAM. Called by nothing in this repo. See the header.
    verify: verify,
    seatForPid: seatForPid,
    personLinkHtml: personLinkHtml,
    seat: function () { return _seat || null; },
    payload: function () { return _payload; },
    // Exposed for the suite: which of the strip's four states is showing, so
    // "still checking" / "nothing on file" / "we could not look" are asserted as
    // three different answers rather than guessed at from one sentence.
    weekState: function () { return _weekState; }
  };

  wire();
})();
