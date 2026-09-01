/* ═══════════════════════════════════════════════════════════════════════════
   door1-workspace.js — Door 1 is ONE desk: claim → person → issue → measure
   ────────────────────────────────────────────────────────────────────────────
   WHAT DOOR 1 STILL WAS

   Door 2 stopped being a stack. ballot-workspace.js put the whole election loop
   on one surface — a rail of every seat, one open seat — and door2-spine.js said
   out loud which surface owns the loop and which are views of it.

   Door 1 had had the same restructure done to its NAVIGATION and not to its
   WORK. The five doors replaced a five-section brochure, and everything they
   opened was still a separate product with its own heading and its own way out:
   a receipt hero, a receipts library, an issue front door, an H.R.1 showcase.
   A reader who arrived with "did my rep actually vote for that?" landed in the
   first of those and then had to work out, unaided, that the answer continued in
   the third one. Four correct surfaces, four entrances, no loop.

   THE LOOP THIS FILE HOLDS

   A reader arrives with one of four things in hand — a claim, a person, an
   issue, or a measure — and should not leave this desk until they have a receipt
   or an honest empty. Two regions, and only two:

     · THE RAIL. Four modes, one active. Beside each, what this reader has
       already done on that surface THIS VISIT — claims checked, people opened,
       issues opened, measures opened. Counts of things that happened, never a
       score, never a completion figure.
     · THE DESK. Exactly one mode. Each mode is a projection of a module that
       already shipped, and the shipped module does the work:
         claim   → PDXClaimCheck (the resolver, the thresholds, the phases)
         person  → the All-Seeing Eye, then the person file at /p/<pid>
         issue   → PDXIssueView.buildRanking + PDXIssueView.warmVotes
         measure → the bills index, then PDXBillDetail's own measure face

   WHAT IT REFUSES TO DO

   · IT FORKS NO ENGINE. There is no claim parser here, no ranking formula, no
     issue mapping, no vote tally and no bill summary. Every fact printed below
     is read from the module that owns it, and where a module is absent the desk
     says so rather than computing a stand-in.
   · IT DOES NOT EMBED A SECOND PROFILE. Person mode is a strip — you are in
     this file, here are its strongest formal rows — and every one of those rows
     is a link into the file itself. A second profile rendered here would be a
     second thing to keep in sync with the first.
   · NO PARTY, EVER. The issue people-list is built from PDXIssueView's own rows,
     which carry a party chip; this file does not read that field. Party is not a
     group, not a sort and not a mark.
   · NO PUBLIC-LANE FIGURE, NO PROGRESS SHARE. The footer advances to the next
     mode this reader has not used and says nothing about how much of anything is
     done. There is no percentage on this surface and no arithmetic that could
     produce one.
   · IT ORDERS THE PEOPLE-LIST BY THE FORMAL RECORD AND BY NOTHING ELSE.
     buildRanking() sorts by its own `value`; that field is deliberately not read
     here. The desk orders by how many formal acts are on file, then by total
     documented evidence, then by name. Direction Match is not read at all.
   · IT DELETES NOTHING. The four old Door 1 surfaces keep their ids, their
     modules, their self-gating, their bodies and their place in the document,
     and every WORK_ID still opens — now also selecting the desk mode it belongs
     to. What changed is that each one says it is a view of this desk, and that
     once the desk has actually painted, each one COLLAPSES to the line that says
     it: title, "A VIEW of the Door 1 workspace", and one control back to the
     desk. The collapse is one attribute and one CSS rule. Nothing is emptied,
     nothing is re-parented, nothing is removed — with JS off, no attribute is
     ever set and all four sections stand exactly as the static HTML ships them.
   · IT COLLAPSES ONLY ITS OWN FOUR. Who Represents Me and the ballot workspace
     are Door 2's; the person-file modal, the proof band and the politician
     showcase are the homepage's; Voter Academy, Mandate, Community and finance
     are their own doors. VIEWS is the whole list this file will touch, and it is
     four ids long.

   THE THREE HONEST EMPTIES ARE QUOTED, NOT INVENTED

     · a claim the record cannot match  → CLAIM_MISS, locked here.
     · an issue with no readable row    → PDXConsistency.menu's own no-vehicle
       sentence, falling back to recordDirection.NOTE_NONE. Never a sentence of
       this file's own, and never one whose subject is the member rather than
       the calendar and the shape of what we hold.
     · a measure with no issue mapping  → MEASURE_NO_MAP, which is bill-detail's
       own refusal, pinned equal to it by the harness.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXDoor1) return;

  // The surface that owns Door 1's loop. Everything else in Door 1 is a view.
  var AUTHORITY = 'pdx-door1-workspace';
  var BODY_ID = 'pdx-d1-body';

  // ── LOCKED COPY ───────────────────────────────────────────────────────────
  // The claim miss. The second clause is the whole sentence: an empty formal
  // lane is a fact about what we hold, and a reader who is told only the first
  // half will hear an acquittal.
  var CLAIM_MISS = 'No matching formal act on file yet — not the same as they never did it.';
  // The measure-with-no-mapping refusal. bill-detail.js prints this exact
  // sentence in its letterhead; it is a literal there rather than an export, so
  // this is a second copy that scripts/test-door-one-workspace.mjs pins equal to
  // the first. Two copies that cannot drift beats one copy this file cannot see.
  var MEASURE_NO_MAP = 'No topics are mapped to this measure yet, so a vote on it is not counted on any issue.';

  // ── THE FOUR MODES ────────────────────────────────────────────────────────
  // `noun` is what the rail counts beside this mode — an event that already
  // happens on the shipped surface, in that surface's own words.
  var MODES = [
    { key: 'claim', ico: '👁️', label: 'Check a claim',
      sub: 'Paste it. The record answers, or says it cannot.', noun: 'checked' },
    { key: 'person', ico: '🧑‍⚖️', label: 'Open a person',
      sub: 'Their file. Formal record first.', noun: 'opened' },
    { key: 'issue', ico: '🧭', label: 'Open an issue',
      sub: 'Who has a formal row on it.', noun: 'opened' },
    { key: 'measure', ico: '🏛️', label: 'Open a measure / vehicle',
      sub: 'Who voted, and what it touches.', noun: 'opened' }
  ];

  // ── THE VIEWS ─────────────────────────────────────────────────────────────
  // The four surfaces inside #pdx-door-work, in document order. Each is a view
  // OF this desk: `job` is the reason to be on it at all, and `mode` is which
  // desk mode a deep link to it belongs to. Every id here is in index.html's
  // WORK_IDS, which is what keeps the inbound anchors alive.
  // A cold homepage was: proof band → this desk → the same four products again,
  // in full, below it. So each of these collapses to ONE LINE once the desk has
  // painted. `label` is the fallback title; the stub prefers the section's own
  // heading, read off the section, so the stub names the chapter the way the
  // reader would have seen it named.
  var VIEWS = [
    { id: 'hero-receipt', mode: 'claim', label: 'One receipt',
      job: 'a single worked receipt, as an example of the format' },
    { id: 'say-vs-do', mode: 'claim', label: 'Say vs. Do',
      job: 'the receipts library, and how a receipt is built' },
    { id: 'issue-front-door', mode: 'issue', label: 'Start with an issue',
      job: 'every tracked issue at once, with its own coverage read' },
    { id: 'hr1-showcase', mode: 'measure', label: 'H.R.1',
      job: 'one measure taken apart, issue by issue' }
  ];

  // ── Session state ─────────────────────────────────────────────────────────
  // Which mode is open, which modes this reader has used, and what they have
  // opened on each surface. All within-visit facts, so all sessionStorage: the
  // rail's counts are "this visit", and a count that survived a week would be a
  // history rather than a place in a loop.
  var K_MODE = 'pdx_d1_mode';
  var K_USED = 'pdx_d1_used';
  var K_SEEN = 'pdx_d1_seen';
  var K_ISSUE = 'pdx_d1_issue';
  var K_MEAS = 'pdx_d1_measure';
  var K_CLAIM = 'pdx_d1_claim';

  var LIST_CAP = 12;   // people on an issue, measures on the shelf
  var ROW_CAP = 3;     // strongest formal rows named on the person strip

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function jsq(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
  function fn(x) { return typeof x === 'function'; }
  function el(id) { return document.getElementById(id); }

  function sget(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function sset(k, v) { try { sessionStorage.setItem(k, String(v == null ? '' : v)); } catch (e) {} }

  function modeOf(key) {
    for (var i = 0; i < MODES.length; i++) if (MODES[i].key === key) return MODES[i];
    return null;
  }

  // ── Which modes have been used, and what has been opened ──────────────────
  function used() {
    var raw = sget(K_USED).split(',');
    var out = [];
    raw.forEach(function (k) { if (modeOf(k) && out.indexOf(k) < 0) out.push(k); });
    return out;
  }
  function markUsed(key) {
    if (!modeOf(key)) return;
    var u = used();
    if (u.indexOf(key) >= 0) return;
    u.push(key);
    sset(K_USED, u.join(','));
  }

  // The seen ledger: per mode, the distinct things opened this visit. Distinct
  // rather than a hit counter, because "3 people opened" should not read 3 after
  // one reader tapped the same file three times.
  function seen() {
    var out = { claim: [], person: [], issue: [], measure: [] };
    var raw = null;
    try { raw = JSON.parse(sget(K_SEEN) || 'null'); } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(out).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(raw, k) && Object.prototype.toString.call(raw[k]) === '[object Array]') {
        raw[k].forEach(function (v) {
          v = String(v || '');
          if (v && out[k].indexOf(v) < 0) out[k].push(v);
        });
      }
    });
    return out;
  }
  function note(kind, id) {
    if (!Object.prototype.hasOwnProperty.call({ claim: 1, person: 1, issue: 1, measure: 1 }, kind)) return;
    id = String(id || '');
    if (!id) return;
    var s = seen();
    if (s[kind].indexOf(id) >= 0) return;
    s[kind].push(id);
    try { sset(K_SEEN, JSON.stringify(s)); } catch (e) {}
  }
  function counts() {
    var s = seen();
    return { claim: s.claim.length, person: s.person.length, issue: s.issue.length, measure: s.measure.length };
  }
  // The last person opened this visit, which is whose file the person strip is
  // reporting from. Read from the same ledger the rail counts, so the strip and
  // the count cannot disagree about whether anyone has been opened.
  function lastPerson() {
    var l = seen().person;
    return l.length ? l[l.length - 1] : '';
  }

  function readMode() {
    var k = sget(K_MODE);
    return modeOf(k) ? k : MODES[0].key;
  }

  // ── Reads into the shipped modules ────────────────────────────────────────
  function claimCheck() {
    var C = window.PDXClaimCheck;
    return (C && fn(C.check) && fn(C.looksLikeClaim)) ? C : null;
  }
  function issueView() {
    var V = window.PDXIssueView;
    return (V && fn(V.buildRanking)) ? V : null;
  }
  function coreIssues() {
    try {
      var l = window.CORE_NATIONAL_ISSUES;
      return (Object.prototype.toString.call(l) === '[object Array]') ? l : [];
    } catch (e) { return []; }
  }
  function coreOf(key) {
    var l = coreIssues();
    for (var i = 0; i < l.length; i++) if (l[i].key === key) return l[i];
    return null;
  }
  // A picked issue can be a core bundle key OR a raw ISSUE_MAP key, because the
  // keys arriving here come from three places with three vocabularies: the shelf
  // (core keys), a resolved claim (a raw stance key), and a measure's mapping
  // (raw keys again). issue-view.js draws the same distinction and this keeps it:
  // a bundle key means rank the whole bundle, a raw key means rank that ONE
  // sub-issue rather than everything else filed beside it. A key that belongs to
  // no bundle at all still opens, scoped to itself, because a bundle is a curation
  // choice and not a fact about the record — see the note inside resolveIssue.
  // Does the site actually ship this issue key? ISSUE_MAP is alignment-tool.js's
  // register of every issue key on the site — 100-odd of them. CORE_NATIONAL_ISSUES
  // is a CURATED THIRTEEN that bundles most of them, and "most" is the whole point
  // below: `lands_preserve` is a shipped key with a label, a chip and formal acts
  // filed against it in the record lane, and no core bundle lists it.
  function shippedIssue(key) {
    try {
      var m = window.ISSUE_MAP && window.ISSUE_MAP[key];
      return !!(m && (m.label || m.chip));
    } catch (e) { return false; }
  }
  function resolveIssue(key) {
    if (!key) return null;
    var direct = coreOf(key);
    if (direct) return { core: direct, focusKey: '', standalone: false };
    var core = null;
    try {
      if (fn(window.coreIssueForKey)) core = window.coreIssueForKey(key) || null;
    } catch (e) { core = null; }
    if (!core) {
      var l = coreIssues();
      for (var i = 0; i < l.length; i++) {
        if ((l[i].keys || []).indexOf(key) !== -1) { core = l[i]; break; }
      }
    }
    if (core) return { core: core, focusKey: key, standalone: false };
    // ── IN NO BUNDLE, AND STILL REAL ────────────────────────────────────────
    // Returning nothing here was a bug, and a bad kind: the desk then printed the
    // record lane's OWN no-vehicle sentence, so a failure of this lookup came out
    // wearing the floor's words and read as "the record holds nothing on public
    // lands". It does hold something. What was missing was a bundle, and a bundle
    // is a curation choice, not a fact about the record.
    //
    // So a shipped key opens AS ITSELF: one issue, ranked on its own record, with
    // no bundle claimed for it. Nothing is invented to do this — buildRanking's
    // contract is `keys` is the set to rank and `focusKey` narrows it to one, so a
    // single-key target ranks exactly that key. The desk says on the surface that
    // this issue sits inside none of the tracked bundles, because a reader who
    // sees a shelf of thirteen and a list for a fourteenth is owed that sentence.
    // A key ISSUE_MAP does not carry still resolves to nothing: that is an unknown
    // key, not an uncurated one, and folding it into the nearest bundle would
    // answer a question nobody asked.
    if (!shippedIssue(key)) return null;
    return {
      core: { key: key, label: issueLabel(key), keys: [key], blurb: '' },
      focusKey: key,
      standalone: true
    };
  }

  function measures() {
    try {
      var B = window.PDXBills;
      if (B && fn(B.listSync)) return (B.listSync().items || []);
      var idx = window.PDX_BILLS_INDEX;
      return (Object.prototype.toString.call(idx) === '[object Array]') ? idx.slice() : [];
    } catch (e) { return []; }
  }
  function measureOf(num) {
    var l = measures();
    num = String(num || '').toLowerCase();
    for (var i = 0; i < l.length; i++) {
      if (String((l[i] && l[i].number) || '').toLowerCase() === num) return l[i];
    }
    return null;
  }
  function issueLabel(key) {
    try {
      var m = window.ISSUE_MAP && window.ISSUE_MAP[key];
      if (m && m.label) return m.label;
    } catch (e) {}
    var c = coreOf(key);
    return (c && c.label) || String(key || '');
  }
  function personOf(pid) {
    if (!pid) return null;
    try { if (fn(window._pdxPersonById)) return window._pdxPersonById(pid) || null; } catch (e) {}
    try { return (window.PROFILES && window.PROFILES[pid]) || (window.CMP_DATA && window.CMP_DATA[pid]) || null; } catch (e) {}
    return null;
  }
  function nameOf(pid) {
    var p = personOf(pid);
    return (p && p.name) || String(pid || '');
  }

  // The sentence for an issue nobody has a readable formal row on. The floor's
  // own vocabulary first — the subject of that sentence is the calendar, not a
  // member — then the record-direction lane's blank note. Never a phrase of this
  // file's own: an empty lane described in new words is a new claim.
  function emptyIssueNote() {
    var C = window.PDXConsistency;
    try {
      var p = C && C.menu && C.menu.PHRASES && C.menu.PHRASES.no_vehicle;
      if (p && p.note) return String(p.note);
    } catch (e) {}
    try {
      if (C && C.recordDirection && C.recordDirection.NOTE_NONE) return String(C.recordDirection.NOTE_NONE);
    } catch (e) {}
    return '';
  }
  // The stowaway note for a measure the index already marked as a package. The
  // mark is `isOmnibus` on the row we were handed; the words are the menu
  // vocabulary's provision_only note. No detector runs here.
  function stowawayNote(card) {
    if (!card || !card.isOmnibus) return null;
    var C = window.PDXConsistency;
    var tag = '', body = '';
    try { tag = (C && C.vehicle && C.vehicle.TAG) ? String(C.vehicle.TAG) : ''; } catch (e) {}
    try {
      var p = C && C.menu && C.menu.PHRASES && C.menu.PHRASES.provision_only;
      if (p && p.note) body = String(p.note);
    } catch (e) {}
    if (!body) return null;
    return { tag: tag, note: body };
  }

  // ── A name is the address of a file ───────────────────────────────────────
  // Same rule as the ballot workspace: every person named here is a real link to
  // /p/<pid>, so it can be middle-clicked and followed. `section:'record'` lands
  // on "What the formal record points to" — person-file.js owns that vocabulary.
  function personLink(pid, label, cls) {
    var PL = window.PDXPersonLink;
    var a = (PL && fn(PL.attrs)) ? PL.attrs(pid, { section: 'record' }) : '';
    if (!a) {
      return '<button type="button" class="' + esc(cls) + '"' +
        ' onclick="window.pdxDoor1Dossier(\'' + jsq(pid) + '\')">' + esc(label) + '</button>';
    }
    return '<a class="' + esc(cls) + '" ' + a + '>' + esc(label) + '</a>';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE RAIL
  // ══════════════════════════════════════════════════════════════════════════
  function railHtml(openKey) {
    var c = counts(), u = used();
    var chips = MODES.map(function (m) {
      var n = c[m.key] || 0;
      // Nothing at zero. A "0 checked" chip is a scoreboard telling a reader
      // they are behind before they have started.
      var tally = n ? '<span class="d1-mode-n">' + n + ' ' + esc(m.noun) + '</span>' : '';
      return '<button type="button" class="d1-mode' +
          (m.key === openKey ? ' is-open' : '') + (u.indexOf(m.key) >= 0 ? ' is-used' : '') + '"' +
        ' aria-current="' + (m.key === openKey ? 'true' : 'false') + '"' +
        ' onclick="window.pdxDoor1Open(\'' + jsq(m.key) + '\')"' +
        ' aria-label="' + esc(m.label + ' — ' + m.sub) + '">' +
        '<span class="d1-mode-ico" aria-hidden="true">' + m.ico + '</span>' +
        '<span class="d1-mode-txt">' +
          '<span class="d1-mode-lb">' + esc(m.label) + '</span>' +
          '<span class="d1-mode-sub">' + esc(m.sub) + '</span>' +
        '</span>' + tally +
      '</button>';
    }).join('');
    return '<div class="d1-rail">' +
        '<div class="d1-rail-lbl">Four ways in · one desk</div>' +
        '<div class="d1-modes" role="group" aria-label="The four ways into Door 1">' + chips + '</div>' +
      '</div>';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESK · CLAIM
  // ══════════════════════════════════════════════════════════════════════════
  // The field and the three doors. PDXClaimCheck owns the thresholds, the
  // resolver call and every phase; this reads state() and routes.
  function claimDeskHtml() {
    var C = claimCheck();
    if (!C) {
      return deskHead('Check a claim', 'Paste a claim about one person and one issue.') +
        '<p class="d1-empty">The claim checker is not loaded on this page, so nothing here can be ' +
        'tested against the record. Nothing was checked and nothing was guessed.</p>';
    }
    var txt = sget(K_CLAIM);
    var head = deskHead('Check a claim',
      'Paste what you heard. We look for one formal act by one person on one issue — and say so when there is not one.');
    var form =
      '<div class="d1-claim-form">' +
        '<label class="d1-claim-lb" for="pdx-d1-claim">The claim, as you heard it</label>' +
        '<textarea id="pdx-d1-claim" class="d1-claim-in" rows="3"' +
          ' placeholder="e.g. “X voted to gut Y”"' +
          ' oninput="window.pdxDoor1ClaimInput(this.value)">' + esc(txt) + '</textarea>' +
        '<div class="d1-claim-row">' +
          '<button type="button" class="d1-go is-lead" onclick="window.pdxDoor1Claim()">' +
            'Check this claim against the record</button>' +
          '<span class="d1-claim-min">At least ' + (C.MIN_CHARS || 40) + ' characters and ' +
            (C.MIN_WORDS || 6) + ' words — below that it is a search, not a claim.</span>' +
        '</div>' +
      '</div>';
    return head + form + claimResultHtml();
  }

  function claimResultHtml() {
    var C = claimCheck();
    var st = null;
    try { st = C && fn(C.state) ? C.state() : null; } catch (e) { st = null; }
    if (!st) return '';
    var phase = st.phase;

    if (phase === 'loading') {
      return '<p class="d1-claim-busy" role="status">Reading the claim…</p>';
    }
    if (phase === 'unresolved') {
      // Not a finding about the record — a finding about the sentence. The
      // resolver's own reason is printed when it gave one.
      return '<div class="d1-out d1-out-flat">' +
        '<p class="d1-out-h">We could not read that as a claim about one person and one issue.</p>' +
        (st.reason ? '<p class="d1-out-p">' + esc(st.reason) + '</p>' : '') +
        '<p class="d1-out-fine">No act was pulled and no vote was named. A confident wrong answer ' +
        'about a named person is worse than none.</p>' +
      '</div>';
    }
    if (phase === 'unavailable') {
      return '<div class="d1-out d1-out-flat">' +
        '<p class="d1-out-h">We could not reach the record just now.</p>' +
        '<p class="d1-out-p">This is a connection problem on our side, not a finding about the claim.</p>' +
        '<button type="button" class="d1-go" onclick="window.pdxDoor1Claim()">Try again</button>' +
      '</div>';
    }
    if (phase === 'no-record') {
      // THE MISS. One locked sentence, and the ONE door that is still honest:
      // the person's own file. No measure door and no issue door, because there
      // is no act on file to name — offering one would be inventing a vote.
      var r = st.reading || {};
      return '<div class="d1-out d1-out-miss">' +
        '<p class="d1-out-h">' + esc(CLAIM_MISS) + '</p>' +
        (r.politician
          ? '<p class="d1-out-p">Read as: <b>' + esc(r.politician) + '</b>' +
            (r.issueLabel ? ' on <b>' + esc(r.issueLabel) + '</b>' : '') + '.</p>'
          : '') +
        (r.pid ? '<div class="d1-doors">' + personLink(r.pid, 'Open ' + nameOf(r.pid) + '’s file', 'd1-door') + '</div>' : '') +
      '</div>';
    }
    if (phase === 'result' && st.card) {
      // THE HIT, and the three doors. The receipt is RENDERED BY ITS OWN
      // RENDERER — PDXReceipts.cardHTML is the same component the hero, the
      // profile and claim-check itself paint, so the verdict, the instrument
      // strength and the citation are stated once in the codebase and read here.
      // Nothing on this card is re-judged, re-worded or re-derived by this file.
      //
      // `actions:false` because the card's own buttons belong to the surface
      // that owns it; the three doors below are this desk's continuation of the
      // loop, and two rows of controls saying similar things is how a reader
      // stops trusting either.
      var card = st.card;
      var cardHtml = '';
      try {
        if (window.PDXReceipts && fn(window.PDXReceipts.cardHTML)) {
          cardHtml = window.PDXReceipts.cardHTML(card, { actions: false }) || '';
        }
      } catch (e) { cardHtml = ''; }
      if (!cardHtml) {
        // The renderer is not on this page. Print only fields the card already
        // carries as text — the proof line, what kind of act it was, the date,
        // and the citation — rather than composing a sentence about it.
        var instr = (card.instrument && card.instrument.label) || '';
        var meta = [instr, card.date].filter(Boolean).map(esc).join(' · ');
        cardHtml = (card.headline ? '<p class="d1-out-h">' + esc(card.headline) + '</p>' : '') +
          (meta ? '<p class="d1-out-meta">' + meta + '</p>' : '') +
          (card.source && card.source.url
            ? '<a class="d1-src" href="' + esc(card.source.url) + '" target="_blank" rel="noopener">🔗 ' +
              esc(card.source.label || 'Official record') + '</a>'
            : '');
      }
      var doors = '';
      if (card.pid) doors += personLink(card.pid, 'The person’s file', 'd1-door');
      if (card.issueKey) {
        doors += '<button type="button" class="d1-door" onclick="window.pdxDoor1Issue(\'' +
          jsq(card.issueKey) + '\')">The ' + esc(issueLabel(card.issueKey)) + ' dossier</button>';
      }
      if (card.measureNumber) {
        doors += '<button type="button" class="d1-door is-lead" onclick="window.pdxDoor1Bill(\'' +
          jsq(card.measureNumber) + '\')">' + esc(card.measureNumber) + ' — who voted</button>';
      }
      return '<div class="d1-out d1-out-hit">' +
        '<p class="d1-out-k">A formal act on file matches this claim’s person and issue.</p>' +
        '<div class="d1-card">' + cardHtml + '</div>' +
        (doors ? '<div class="d1-doors">' + doors + '</div>' : '') +
        '<p class="d1-out-fine">One act, not a whole record. The doors above open the file, the issue ' +
        'and the measure it was cast on.</p>' +
      '</div>';
    }
    return '';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESK · PERSON
  // ══════════════════════════════════════════════════════════════════════════
  // A strip, not a profile. When a file has been opened this visit it says so
  // and names that person's strongest formal rows, each a link INTO the file.
  function personDeskHtml() {
    var head = deskHead('Open a person', 'Search by name. The file opens at /p/<id>, formal record first.');
    var eye = '<div class="d1-claim-row">' +
        '<button type="button" class="d1-go is-lead" onclick="window.pdxDoor1Person()">' +
          'Search any politician by name</button>' +
      '</div>';
    var pid = lastPerson();
    if (!pid) {
      return head + eye +
        '<p class="d1-empty">No file open yet this visit. The search above is the person surface — ' +
        'this desk keeps your place in the loop rather than holding a second copy of anyone’s file.</p>';
    }

    var rows = [];
    try {
      var C = window.PDXConsistency;
      if (C && C.formalPatternIndex && fn(C.formalPatternIndex.rows)) {
        rows = (C.formalPatternIndex.rows(pid, { sort: 'strength' }) || []).slice(0, ROW_CAP);
      }
    } catch (e) { rows = []; }

    var body = rows.length
      ? '<ul class="d1-rows">' + rows.map(function (r) {
          var bits = [r.patLabel, r.counts].filter(Boolean).map(esc).join(' · ');
          return '<li class="d1-row">' +
            personLink(pid, r.label || r.key, 'd1-row-a') +
            (bits ? '<span class="d1-row-m">' + bits + '</span>' : '') +
          '</li>';
        }).join('') + '</ul>'
      : '<p class="d1-empty">' + esc(emptyIssueNote() ||
          'Nothing on this file has reached the formal pattern index yet.') + '</p>';

    return head +
      '<div class="d1-strip">' +
        '<span class="d1-strip-k">You are in the file</span>' +
        '<span class="d1-strip-n">' + esc(nameOf(pid)) + '</span>' +
        personLink(pid, 'Back to the file', 'd1-strip-go') +
      '</div>' +
      '<p class="d1-lead">Their strongest rows on the formal record — each one opens that file at ' +
      'what the formal record points to.</p>' + body + eye;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESK · ISSUE
  // ══════════════════════════════════════════════════════════════════════════
  // The issue shelf, then the people with a readable formal row on the picked
  // issue. Order is the formal record's: acts on file, then total documented
  // evidence, then name. buildRanking's own `value` is never read, and neither
  // is party or any match reading.
  function issuePeople(core, focusKey) {
    var V = issueView();
    if (!V) return null;
    var rows = [];
    try { rows = V.buildRanking(core, focusKey || '') || []; } catch (e) { return null; }
    var keep = rows.filter(function (r) {
      return r && ((r.voteCount || 0) > 0 || (r.receiptCount || 0) > 0);
    });
    keep.sort(function (a, b) {
      if ((b.voteCount || 0) !== (a.voteCount || 0)) return (b.voteCount || 0) - (a.voteCount || 0);
      if ((b.evidenceCount || 0) !== (a.evidenceCount || 0)) return (b.evidenceCount || 0) - (a.evidenceCount || 0);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return keep;
  }

  function issueDeskHtml() {
    var head = deskHead('Open an issue', 'Pick one. Then: who has a formal row on it.');
    var list = coreIssues();
    if (!list.length) {
      return head + '<p class="d1-empty">The issue set is not loaded on this page yet.</p>';
    }
    var picked = sget(K_ISSUE);
    var t = resolveIssue(picked);
    var core = t && t.core;
    var focusKey = (t && t.focusKey) || '';
    var shelf = '<div class="d1-shelf" role="group" aria-label="Tracked issues">' + list.map(function (c) {
      return '<button type="button" class="d1-chip' + (core && c.key === core.key ? ' is-open' : '') + '"' +
        ' onclick="window.pdxDoor1Issue(\'' + jsq(c.key) + '\')">' + esc(c.label) + '</button>';
    }).join('') + '</div>';
    if (!core) {
      if (picked) {
        // A key we hold no bundle for. Nothing is listed and nothing is
        // approximated: the honest empty is the floor's own no-vehicle sentence.
        return head + shelf + '<p class="d1-empty">' + esc(emptyIssueNote()) + '</p>';
      }
      return head + shelf + '<p class="d1-lead">Pick an issue above.</p>';
    }

    var V = issueView();
    var pending = false;
    try { pending = !!(V && fn(V.votesPending) && V.votesPending()); } catch (e) { pending = false; }

    var people = issuePeople(core, focusKey);
    var body;
    if (people === null) {
      body = '<p class="d1-empty">The issue ledger is not loaded on this page, so this desk cannot ' +
        'list anyone. Nothing was ranked.</p>';
    } else if (!people.length && pending) {
      // A read in flight is not an empty record. Saying "nothing on file" here
      // would be a finding produced by a pending request.
      body = '<p class="d1-claim-busy" role="status">Reading the roll-call record for this issue…</p>';
    } else if (!people.length) {
      body = '<p class="d1-empty">' + esc(emptyIssueNote()) + '</p>';
    } else {
      var BASE = '';
      try { BASE = String(window._PDX_ALIGN_BASE_TAG || ''); } catch (e) { BASE = ''; }
      body = '<ul class="d1-people">' + people.slice(0, LIST_CAP).map(function (r) {
        var acts = (r.voteCount || 0);
        var recs = (r.receiptCount || 0);
        var facts = [];
        if (acts) facts.push(acts + ' formal act' + (acts === 1 ? '' : 's') + ' on file');
        if (recs) facts.push(recs + ' receipt' + (recs === 1 ? '' : 's'));
        // BASELINE MARKED. tierKey 'voted' is buildRanking's own word for "a
        // record, with nothing stated to check it against" — the row rests on the
        // record baseline. The tag is the alignment lane's own.
        var base = (r.tierKey === 'voted' && BASE)
          ? '<span class="d1-base">' + esc(BASE) + '</span>' : '';
        var cite = (r.voteCite && r.voteCite.number)
          ? '<button type="button" class="d1-cite" onclick="window.pdxDoor1Bill(\'' +
            jsq(r.voteCite.number) + '\')">' + esc(r.voteCite.number) + '</button>' : '';
        return '<li class="d1-person">' +
          personLink(r.id, r.name || r.id, 'd1-person-a') + base +
          '<span class="d1-person-m">' + esc(facts.join(' · ')) + '</span>' + cite +
        '</li>';
      }).join('') + '</ul>' +
      (people.length > LIST_CAP
        ? '<p class="d1-more">' + (people.length - LIST_CAP) + ' more with a formal row on this issue — ' +
          '<button type="button" class="d1-link" onclick="window.pdxDoor1IssueFace(\'' + jsq(focusKey || core.key) +
          '\')">open the full ' + esc(core.label) + ' ledger</button>.</p>'
        : '');
    }
    var scope = '';
    if (focusKey && t.standalone) {
      // No bundle to name, and no bundle invented for it. This is the sentence
      // that keeps a fourteenth list from looking like a bug in the shelf.
      scope = '<p class="d1-scope">Scoped to <b>' + esc(issueLabel(focusKey)) +
        '</b> alone — it is not inside any of the tracked issues above, so only its own ' +
        'record is ranked here.</p>';
    } else if (focusKey) {
      scope = '<p class="d1-scope">Scoped to <b>' + esc(issueLabel(focusKey)) + '</b>, inside ' +
        esc(core.label) + ' — not the whole bundle.</p>';
    }
    return head + shelf + scope +
      '<p class="d1-lead">Ordered by what is on the formal record — acts on file first, then total ' +
      'documented evidence, then name. Not by any match reading.</p>' + body;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESK · MEASURE
  // ══════════════════════════════════════════════════════════════════════════
  function measureDeskHtml() {
    var head = deskHead('Open a measure / vehicle', 'Pick one. Then: who voted, and which issues it maps to.');
    var list = measures();
    if (!list.length) {
      return head + '<p class="d1-empty">The measure index has not loaded yet. Nothing here is guessed ' +
        'from a bill number.</p>';
    }
    var picked = sget(K_MEAS);
    var card = measureOf(picked);
    var shelf = '<div class="d1-shelf" role="group" aria-label="Measures on file">' + list.slice(0, LIST_CAP).map(function (b) {
      return '<button type="button" class="d1-chip' + (card && b.number === card.number ? ' is-open' : '') + '"' +
        ' onclick="window.pdxDoor1Measure(\'' + jsq(b.number) + '\')"' +
        ' title="' + esc(b.title || b.shortTitle || '') + '">' + esc(b.number) + '</button>';
    }).join('') + '</div>';
    if (!card) return head + shelf + '<p class="d1-lead">Pick a measure above.</p>';

    // MEMBERSHIP, NOT ORDER. The light index sometimes names a primary the
    // issueKeys array omits, so the flag adds a key that would otherwise be
    // lost — exactly the rule bill-detail.js states for the same field. It does
    // not promote anything to the front, and no key is derived here.
    var keys = (card.issueKeys || []).filter(Boolean);
    if (card.primaryIssue && keys.indexOf(card.primaryIssue) < 0) keys = keys.concat([card.primaryIssue]);

    var meta = [card.chamber, card.congress ? (card.congress + 'th Congress') : '', card.status]
      .filter(Boolean).map(esc).join(' · ');

    var maps = keys.length
      ? '<div class="d1-shelf d1-shelf-issues">' + keys.map(function (k) {
          return '<button type="button" class="d1-chip is-issue" onclick="window.pdxDoor1Issue(\'' +
            jsq(k) + '\')">' + esc(issueLabel(k)) + '</button>';
        }).join('') + '</div>'
      : '<p class="d1-empty">' + esc(MEASURE_NO_MAP) + '</p>';

    var stow = stowawayNote(card);
    var stowHtml = stow
      ? '<div class="d1-stow">' + (stow.tag ? '<span class="d1-stow-t">📦 ' + esc(stow.tag) + '</span>' : '') +
        '<span class="d1-stow-n">' + esc(stow.note) + '</span></div>'
      : '';

    return head + shelf +
      '<div class="d1-meas">' +
        '<p class="d1-meas-n">' + esc(card.number) + '</p>' +
        '<p class="d1-meas-t">' + esc(card.title || card.shortTitle || '') + '</p>' +
        (meta ? '<p class="d1-out-meta">' + meta + '</p>' : '') +
        '<div class="d1-doors">' +
          '<button type="button" class="d1-door is-lead" onclick="window.pdxDoor1Bill(\'' +
            jsq(card.number) + '\')">Who voted on it</button>' +
          (card.source && card.source.url
            ? '<a class="d1-src" href="' + esc(card.source.url) + '" target="_blank" rel="noopener">🔗 ' +
              esc((card.source && card.source.label) || 'Official record') + '</a>' : '') +
        '</div>' +
        '<p class="d1-lead">Which issues it maps to</p>' + maps + stowHtml +
      '</div>';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE DESK, AND ITS ONE FOOTER CONTROL
  // ══════════════════════════════════════════════════════════════════════════
  function deskHead(title, lead) {
    return '<div class="d1-desk-hd">' +
      '<h4 class="d1-desk-t">' + esc(title) + '</h4>' +
      '<p class="d1-desk-l">' + esc(lead) + '</p>' +
    '</div>';
  }

  // The next mode this reader has not used, in rail order. Null when they have
  // used all four — which is a fact about their path, not a completion figure.
  function nextMode(fromKey) {
    var u = used();
    for (var i = 0; i < MODES.length; i++) {
      var m = MODES[i];
      if (m.key !== fromKey && u.indexOf(m.key) < 0) return m;
    }
    return null;
  }

  function footHtml(openKey) {
    var nx = nextMode(openKey);
    if (nx) {
      return '<div class="d1-foot">' +
        '<button type="button" class="d1-next" onclick="window.pdxDoor1Next()"' +
          ' aria-label="' + esc('Next in Door 1: ' + nx.label) + '">' +
          'Next in Door 1 · ' + esc(nx.label) + ' <span aria-hidden="true">›</span></button>' +
      '</div>';
    }
    return '<div class="d1-foot">' +
      '<button type="button" class="d1-next" onclick="window.pdxDoor1Next()"' +
        ' aria-label="Every way in used this visit — back to the rail">' +
        'Next in Door 1 · back to the rail <span aria-hidden="true">↑</span></button>' +
    '</div>';
  }

  function deskHtml(openKey) {
    var body = '';
    if (openKey === 'claim') body = claimDeskHtml();
    else if (openKey === 'person') body = personDeskHtml();
    else if (openKey === 'issue') body = issueDeskHtml();
    else if (openKey === 'measure') body = measureDeskHtml();
    return '<div class="d1-desk" data-d1-mode="' + esc(openKey) + '">' + body + footHtml(openKey) + '</div>';
  }

  // ── Is there a desk to show at all ────────────────────────────────────────
  // Fail closed, like everything under Door 1's bridge. A mode whose module is
  // absent still paints its own honest line, but a page with NONE of the four
  // modules behind it has no desk, and an empty two-region shell would be
  // chrome promising work it cannot host.
  function anyMode() {
    if (claimCheck()) return true;
    if (issueView() && coreIssues().length) return true;
    if (measures().length) return true;
    if (window.PDXPersonLink && fn(window.PDXPersonLink.attrs)) return true;
    return false;
  }

  // Did the last sync() actually paint a desk? The collapse below hangs on this
  // and on nothing else: a section may only be reduced to "a view of the desk"
  // once the desk it is a view of is on the page and filled. Every path that
  // returns false from sync() clears it first, so a page that loses its mount
  // stops collapsing on the next pass.
  var _live = false;

  function sync() {
    var mount = el(AUTHORITY);
    if (!mount) { _live = false; return false; }
    var host = el(BODY_ID);
    if (!host) { _live = false; return false; }
    if (!anyMode()) {
      _live = false;
      host.innerHTML = '';
      try { mount.setAttribute('hidden', ''); } catch (e) {}
      return false;
    }
    try { mount.removeAttribute('hidden'); } catch (e) {}
    var openKey = readMode();
    markUsed(openKey);
    host.innerHTML =
      '<div class="d1-hd">' +
        '<div class="d1-eyebrow">Door 1 workspace</div>' +
        '<h3 class="d1-title">One desk: a claim, a person, an issue, a measure</h3>' +
        '<p class="d1-sub">Arrive with any one of the four. Stay here until you have a receipt — ' +
        'or until the record says, in its own words, that it does not hold one.</p>' +
      '</div>' +
      '<div class="d1-body">' + railHtml(openKey) + deskHtml(openKey) + '</div>';
    _live = true;
    views();
    return true;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW CHROME · the four old Door 1 surfaces say what they are
  // ══════════════════════════════════════════════════════════════════════════
  // Same treatment Door 2 gave its three views, for the same reason: a heading
  // that looks like a product IS a product to a reader, and four of them under
  // one desk read as five things that happen to agree. Nothing is moved, nothing
  // is deleted, no module is told about this — each surface gets one strip at its
  // top saying which desk it is a view of and which mode it belongs to.
  // The stub, and it is the whole of the collapsed section: what this chapter was
  // called, that it is a view of the desk, and ONE control that puts it on the
  // desk. Three facts and one button — a second control here would be the start
  // of the section becoming a product again.
  function viewStrip(view, title) {
    var m = modeOf(view.mode) || {};
    return '' +
      '<div class="d1-view-strip">' +
        '<span class="d1-view-kick">A VIEW of the Door 1 workspace</span>' +
        '<span class="d1-view-name">' + esc(title || view.label) + '</span>' +
        '<span class="d1-view-job">' + esc(view.job) + '</span>' +
        '<button type="button" class="d1-view-open"' +
          ' onclick="return window.PDXDoor1.toDesk(\'' + jsq(view.mode) + '\');"' +
          ' title="' + esc('Opens on the desk as ' + (m.label || 'one mode') +
            ' — one mode at a time, without leaving the page') + '"' +
          ' aria-label="' + esc('Open in Door 1: ' + (m.label || view.label)) + '">' +
          'Open in Door 1 <span aria-hidden="true">↑</span></button>' +
      '</div>';
  }
  // The chapter's own title, read off the section rather than restated here, so
  // the stub cannot end up naming something the section does not call itself.
  // Three sources, strongest first, and no cache — all four of these sections
  // ship EMPTY in index.html and are painted by their own modules on their own
  // schedules, so a title captured on the first pass would be the fallback
  // forever. Re-read on every paint, and the settle schedule upgrades it the
  // moment the module has painted a heading. Hiding the body does not hide it
  // from this: display:none changes nothing about textContent.
  //
  //   1. the heading the module painted — what a sighted reader saw
  //   2. the section's aria-label — its own accessible name, in index.html
  //   3. the short label in VIEWS — always available, never wrong
  function titleOf(host, view) {
    var t = '';
    try {
      var h = host.querySelector && host.querySelector('h1, h2, h3');
      if (h) t = String(h.textContent || '').replace(/\s+/g, ' ').trim();
    } catch (e) { t = ''; }
    if (!t) {
      try { t = String(host.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(); }
      catch (e) { t = ''; }
    }
    if (t.length > 90) t = '';
    return t || view.label;
  }
  function paintView(view) {
    var host = el(view.id);
    if (!host) return false;
    host.setAttribute('data-door1-view', view.id);
    host.setAttribute('data-door1-of', AUTHORITY);
    host.setAttribute('data-door1-mode', view.mode);
    var slotId = 'd1-strip-' + view.id;
    var slot = el(slotId);
    if (!slot || slot.parentNode !== host) {
      slot = document.createElement('div');
      slot.id = slotId;
      slot.className = 'd1-strip-slot';
      host.insertBefore(slot, host.firstChild);
    }
    slot.innerHTML = viewStrip(view, titleOf(host, view));
    // ── THE COLLAPSE ────────────────────────────────────────────────────────
    // One attribute, and door1-workspace.css hides every child of the section
    // EXCEPT this slot. The body is not emptied, not detached and not moved: it
    // is still in the document, still addressable, and the module that owns it
    // can keep painting into it without knowing any of this happened. Deep links
    // still land here — the router opens the layer and scrolls to the section,
    // and the wrapper on it has already put the matching mode on the desk.
    if (_live) host.setAttribute('data-door1-collapsed', '1');
    return true;
  }
  function views() {
    // Only once there is a desk for them to be views OF. Labelling a surface a
    // view of something that never mounted — or collapsing it in favour of a desk
    // that is not there — would be the one lie this chrome exists to prevent.
    if (!el(AUTHORITY) || !el(BODY_ID)) return;
    VIEWS.forEach(function (v) { paintView(v); });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════════════════════════════════════
  function scrollHere() {
    var mount = el(AUTHORITY);
    if (mount && mount.scrollIntoView) {
      try { mount.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (e) { mount.scrollIntoView(true); }
    }
  }

  // Opening a mode repaints in place and never navigates. That is the point: the
  // loop's four steps used to be four sections with four headings.
  window.pdxDoor1Open = function (key, opts) {
    if (!modeOf(key)) return false;
    sset(K_MODE, key);
    markUsed(key);
    sync();
    if (!(opts && opts.quiet)) scrollHere();
    return true;
  };

  window.pdxDoor1Next = function () {
    var nx = nextMode(readMode());
    if (nx) return window.pdxDoor1Open(nx.key);
    scrollHere();
    return false;
  };

  window.pdxDoor1ClaimInput = function (v) { sset(K_CLAIM, v); };

  window.pdxDoor1Claim = function () {
    var C = claimCheck();
    if (!C) return false;
    var node = el('pdx-d1-claim');
    var txt = node ? String(node.value || '') : sget(K_CLAIM);
    sset(K_CLAIM, txt);
    var shaped = false;
    try { shaped = !!C.looksLikeClaim(txt); } catch (e) { shaped = false; }
    if (!shaped) {
      // The shipped thresholds decide this, and they are already printed under
      // the field. Repaint so the field keeps what was typed and stop.
      sync();
      return false;
    }
    var p = null;
    try { p = C.check(txt); } catch (e) { p = null; }
    sync();
    if (p && fn(p.then)) p.then(function () { sync(); }, function () { sync(); });
    return true;
  };

  window.pdxDoor1Person = function () {
    try { if (fn(window.pdxOpenEye)) { window.pdxOpenEye(); return true; } } catch (e) {}
    var i = el('pdx-eye-input');
    if (i && i.focus) { try { i.focus(); return true; } catch (e) {} }
    return false;
  };

  window.pdxDoor1Dossier = function (pid) {
    var PL = window.PDXPersonLink;
    try { if (PL && fn(PL.open) && PL.open(pid, { section: 'record' })) return true; } catch (e) {}
    try { if (fn(window.showProfile)) { window.showProfile(pid); return true; } } catch (e) {}
    return false;
  };

  window.pdxDoor1Issue = function (key) {
    var t = resolveIssue(key);
    sset(K_ISSUE, String(key || ''));
    if (!t) { sync(); return false; }
    note('issue', t.focusKey || t.core.key);
    // Ask the ledger for this issue's roll-call evidence before ranking it — the
    // read is the ledger's own, and without it a cold page reads an UNLOADED
    // record as an empty one and then prints the record lane's no-vehicle
    // sentence over it.
    //
    // THE TARGET GOES IN, NOT THE KEY. PDXIssueView.warmVotes takes either, and the
    // difference matters here and nowhere else: handed a key it resolves the bundle
    // itself, and there is no bundle for a shipped issue key that none of the
    // curated thirteen lists — so it would warm nothing for exactly the keys this
    // desk had to resolve by hand. The target resolveIssue already built is the
    // whole answer, so it is what gets handed over.
    //
    // No callback: the export does not take one, and the desk does not need one.
    // The ledger fires 'pdx-issue-votes' once per batch and boot() re-syncs on it,
    // which is one repaint for two surfaces instead of one repaint each.
    var V = issueView();
    try {
      if (V && fn(V.warmVotes)) V.warmVotes(t.core, t.focusKey || '');
    } catch (e) {}
    if (readMode() !== 'issue') return window.pdxDoor1Open('issue');
    sync();
    return true;
  };

  window.pdxDoor1Measure = function (num) {
    var card = measureOf(num);
    if (!card) return false;
    sset(K_MEAS, card.number);
    note('measure', card.number);
    // Picking lands on the desk that shows the pick, same as an issue. A pick
    // recorded on a mode the reader is not looking at is a pick they cannot see.
    if (readMode() !== 'measure') return window.pdxDoor1Open('measure');
    sync();
    return true;
  };

  // The issue face, through the same cascade bill-detail.js uses: the issue page
  // if it holds this key, then the ledger view, then the library filtered to it.
  window.pdxDoor1IssueFace = function (key) {
    if (!key) return false;
    try {
      var IP = window.PDXIssuePage;
      if (IP && fn(IP.has) && IP.has(key) && IP.open(key)) return true;
    } catch (e) {}
    try { if (window.PDXIssueView && fn(window.PDXIssueView.open)) { window.PDXIssueView.open(key); return true; } } catch (e) {}
    try {
      if (window.PDXDigitalLibrary && fn(window.PDXDigitalLibrary.focus)) {
        window.PDXDigitalLibrary.focus({ mode: 'library', issue: key });
        return true;
      }
    } catch (e) {}
    return false;
  };

  window.pdxDoor1Bill = function (num) {
    try {
      if (window.PDXBillDetail && fn(window.PDXBillDetail.open)) { window.PDXBillDetail.open(num); return true; }
    } catch (e) {}
    try { if (fn(window.pdxOpenBills)) return window.pdxOpenBills(); } catch (e) {}
    return false;
  };

  window.PDXDoor1 = {
    AUTHORITY: AUTHORITY,
    MODES: MODES,
    VIEWS: VIEWS,
    CLAIM_MISS: CLAIM_MISS,
    MEASURE_NO_MAP: MEASURE_NO_MAP,
    sync: sync,
    views: views,
    open: window.pdxDoor1Open,
    next: window.pdxDoor1Next,
    // Back to the desk from a view, landing on the mode that view belongs to.
    toDesk: function (mode) {
      if (modeOf(mode)) window.pdxDoor1Open(mode);
      else scrollHere();
      return false;
    },
    // Reads, for the harness and for the view chrome. Pure — nothing here
    // computes a score, a share or an order the desk does not already print.
    _mode: readMode,
    _used: used,
    _counts: counts,
    _next: nextMode,
    _seen: seen,
    _note: note,
    _people: issuePeople,
    _resolveIssue: resolveIssue,
    _measures: measures,
    _emptyIssueNote: emptyIssueNote,
    _stowaway: stowawayNote,
    _strip: viewStrip,
    _title: titleOf,
    // Is a desk painted right now — the single condition the collapse hangs on.
    _live: function () { return _live; }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // STAYING IN STEP · WORK_IDS still route, and the rail still counts
  // ══════════════════════════════════════════════════════════════════════════
  // Two wrapping jobs, both in the door2-spine idiom — wrap the shipped entry
  // point rather than poll, and mark each wrapper so a double boot cannot stack
  // two of them.
  //
  //   ROUTING. index.html's openWork(id) and pdxDoor(mode) are Door 1's existing
  //   navigation. A deep link to #hr1-showcase, a nav item, a shared hash and a
  //   door in the chooser all pass through one of those two, so wrapping them is
  //   how every one of those entrances also selects the desk mode it belongs to
  //   — without touching the router, and without a fifth door.
  //
  //   COUNTING. The rail's four figures are counts of events that already happen
  //   on the shipped surfaces: a claim checked, a file opened, an issue opened, a
  //   measure opened. Each is recorded where it happens, so the rail cannot
  //   report activity that did not occur and cannot miss activity that did.
  function wrapWin(name, flag, after) {
    if (!fn(window[name]) || window[name][flag]) return;
    var orig = window[name];
    var w = function () {
      var out;
      try { out = orig.apply(this, arguments); } catch (e) { out = undefined; }
      try { after.apply(null, arguments); } catch (e) {}
      return out;
    };
    w[flag] = true;
    try { window[name] = w; } catch (e) {}
  }
  function wrapObj(obj, name, flag, after) {
    if (!obj || !fn(obj[name]) || obj[name][flag]) return;
    var orig = obj[name];
    var w = function () {
      var out;
      try { out = orig.apply(this, arguments); } catch (e) { out = undefined; }
      try { after.apply(null, arguments); } catch (e) {}
      return out;
    };
    w[flag] = true;
    try { obj[name] = w; } catch (e) {}
  }

  function modeForWorkId(id) {
    for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i].id === id) return VIEWS[i].mode;
    return '';
  }

  function hook() {
    // WORK_ID → mode. `quiet` because the router is already scrolling the reader
    // to the surface they named; a second scroll to the desk would fight it.
    wrapWin('pdxDoorWork', '__d1Route', function (targetId) {
      var m = modeForWorkId(String(targetId || ''));
      if (m) window.pdxDoor1Open(m, { quiet: true });
    });
    // The chooser's five doors. 'bills' and 'receipts' are not chooser doors but
    // are reached by the nav, and both belong to a mode here.
    wrapWin('pdxDoor', '__d1Door', function (mode) {
      var map = { person: 'person', claim: 'claim', issue: 'issue', bill: 'measure', bills: 'measure', receipts: 'claim' };
      var m = map[String(mode || '')];
      if (m) window.pdxDoor1Open(m, { quiet: true });
    });

    // A file opened, anywhere on the page. openModal is the renderer every path
    // funnels into (PDXPerson.open and showProfile both reach it), so one
    // wrapper counts every way in.
    wrapWin('openModal', '__d1Person', function (pid) {
      note('person', pid);
      sync();
    });
    wrapObj(window.PDXClaimCheck, 'check', '__d1Claim', function (text) {
      var C = window.PDXClaimCheck;
      var shaped = false;
      try { shaped = !!(C && C.looksLikeClaim && C.looksLikeClaim(text)); } catch (e) {}
      if (shaped) { note('claim', String(text || '').slice(0, 160)); sync(); }
    });
    wrapObj(window.PDXIssueView, 'open', '__d1Issue', function (key) {
      note('issue', key); sync();
    });
    wrapObj(window.PDXBillDetail, 'open', '__d1Bill', function (ref) {
      note('measure', ref); sync();
    });
  }

  function boot() {
    hook();
    sync();
    // The measure shelf is fed by bills-index.js, which pdx-lazy-data.js fetches
    // on demand — so ask for it, and repaint when it lands. Without this the
    // measure mode would sit on its honest "not loaded yet" line for a reader who
    // never opened the Legislation tab.
    try {
      if (window.PDXLazyData && fn(window.PDXLazyData.whenReady)) {
        window.PDXLazyData.whenReady('bills', function () { sync(); });
      }
    } catch (e) {}
    // The ledger announces its roll-call reads; a repaint on that event is what
    // turns "reading…" into rows without polling.
    try { window.addEventListener('pdx-issue-votes', function () { sync(); }); } catch (e) {}
    // Same settle schedule the ballot workspace uses, for the same reason: the
    // modules this reads are a mix of plain and deferred scripts, and the first
    // paint can legitimately land before the roster or the ledger is ready.
    [400, 1200, 3000].forEach(function (ms) {
      setTimeout(function () { hook(); sync(); }, ms);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
