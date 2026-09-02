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

  // ── ONE ARRIVAL TABLE, AND EVERY ENTRANCE READS IT ────────────────────────
  // WORK_ID → the desk mode that id belongs to. This is the whole map, VIEWS is
  // the whole of its source, and there are exactly three callers: the hash (on
  // load and on hashchange), the stub's own "Open in Door 1" control, and the
  // wrapper on index.html's router. They were three answers to one question
  // before — the router wrapper read VIEWS, the stub read a mode literal baked
  // into its own markup, and the hash read nothing at all and simply scrolled —
  // which is how a reader could land on #say-vs-do with `measure` on the rail.
  // One function, so the three cannot disagree again.
  function modeForWorkId(id) {
    id = String(id == null ? '' : id).replace(/^#/, '');
    for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i].id === id) return VIEWS[i].mode;
    return '';
  }
  // The hash, as an id. A hash that names none of the four returns '' here and
  // every arrival path below then does nothing with it — a hash aimed at Door 2,
  // at a person file or at anything else on this page must not have its scroll
  // taken away by this desk.
  function hashId() {
    try { return String(location.hash || '').replace(/^#/, ''); } catch (e) { return ''; }
  }

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
  // ── THE FAMILY TABLE, AND WHY THIS DESK ASKS IT RATHER THAN THE ARRAY ──────
  // window.PDXIssueFamily (pdx-issue-family.js) is the one reader of the one
  // parent table — the same table the person file's topic tree groups by, so a
  // core here and a branch there cannot disagree about which family a key is in.
  // Every call below falls back to the shipped array, so a page that loads the
  // desk without the family module renders exactly as it did before it existed.
  function family() {
    var F = window.PDXIssueFamily;
    return (F && fn(F.coreOf) && fn(F.childrenOf)) ? F : null;
  }
  // ── THE ISSUE HUE, ASKED OF THE ONE PALETTE ───────────────────────────────
  // A chip on this desk is the same issue a reader has already met on /p/<slug>,
  // in the topic tree, on a Word-vs-Action row and in the Eye's issue hits — and
  // until now it was the only one of those that painted it as an untyped dark
  // pill. So it asks the same module they all ask, window.PDXIssueColors
  // (issue-colors.js), and paints what it is handed. There is no palette in this
  // file, no per-issue rule in its stylesheet, and no hex anywhere in either: the
  // token arrives as four inline custom properties (--pdx-ic, -soft, -wash, -ink)
  // and the CSS below consumes them without knowing which issue it got. Change a
  // hue in issue-colors.js and it changes here, which is the point.
  //
  // THE LOOKUP IS THE FAMILY TABLE, NOT A SECOND ANSWER. A leaf key has no colour
  // of its own — it inherits its core's, which is exactly the behaviour asked for
  // ("if a key has no colour, inherit the parent core's hue"). getIssueColor()
  // would resolve that itself through window.coreIssueForKey, but this desk hands
  // it PDXIssueFamily.coreOf instead, so the hue a chip carries comes off the SAME
  // read that decided which branch the chip sits on. A child therefore cannot be
  // painted one family while being filed under another; the two answers are one
  // answer. The older reverse lookup stays underneath as the fallback, so a page
  // without the family module colours exactly as it did before it existed.
  //
  // ALL OF ONE CORE'S CHILDREN SHARE ONE HUE, DELIBERATELY. Seventeen green chips
  // on the Climate, Energy & Land branch is the honest reading: they are seventeen
  // questions in one family, and a per-child hue would be this desk inventing a
  // taxonomy the palette does not have. What separates them is STATE, not
  // identity — see `is-open` in door1-workspace.css: the lit chip takes the loud
  // step of its hue and the unlit ones the quiet step. Nothing here reads a
  // record, a count or a band, so an empty child is painted exactly like a full
  // one. A colour that went grey when a key held nothing would be this desk
  // characterising the key, and 'no measure mapped yet' is a fact about the
  // corpus, not a property of the issue.
  function colors() {
    var C = window.PDXIssueColors;
    return (C && fn(C.styleFor) && fn(C.getIssueColor)) ? C : null;
  }
  function familyLookup() {
    var F = family();
    if (!F) return undefined;
    return function (k) { try { return F.coreOf(k) || ''; } catch (e) { return ''; } };
  }
  // { style, on } — the inline custom properties, and whether the key landed on a
  // real core issue. `on` gates the treatment rather than the colour: an
  // off-register key still gets the palette's own neutral (that is what FALLBACK
  // is for) but does not get the themed chip, so an unknown key reads as unknown
  // instead of borrowing the hue of whatever it was filed near.
  function issueSkin(key) {
    var C = colors();
    if (!C || !key) return { style: '', on: false };
    var lu = familyLookup();
    var on = false, style = '';
    try {
      style = C.styleFor(key, lu) || '';
      on = fn(C.isCore) ? !!C.isCore(key, lu) : !!(C.getIssueColor(key, lu) || {}).mapped;
    } catch (e) { return { style: '', on: false }; }
    return { style: style, on: !!on };
  }
  // The two attributes, spelled once. `data-ic` is the gate the stylesheet keys
  // off — the same attribute name app.css and issue-compare.css already use for
  // exactly this job — so there is one spelling of "this element is themed".
  function skinAttrs(key) {
    var sk = issueSkin(key);
    if (!sk.on || !sk.style) return '';
    return ' data-ic="1" style="' + esc(sk.style) + '"';
  }

  function coreOf(key) {
    var F = family();
    if (F) {
      try { if (F.isCore(key)) return F.coreObject(key); } catch (e) {}
    }
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
  // register of every issue key on the site — 121 of them. CORE_NATIONAL_ISSUES is
  // the THIRTEEN CORES those keys are filed under, and since September 2026 it is
  // the whole register rather than a curation of it: every published key has
  // exactly one parent, so `lands_preserve` — a shipped key with a label, a chip
  // and four mapped measures — is a child chip on the Climate, Energy & Land
  // branch as well as a key you can open by name.
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
    // THE TABLE FIRST. One question — "which core is this key's parent?" — asked
    // of the module that owns the answer. The two older lookups stay underneath
    // it as fallbacks, in the order they shipped.
    var F = family();
    if (F) {
      try {
        var pid = F.coreOf(key);
        if (pid) core = coreOf(pid);
      } catch (e) { core = null; }
    }
    try {
      if (!core && fn(window.coreIssueForKey)) core = window.coreIssueForKey(key) || null;
    } catch (e) { core = core || null; }
    if (!core) {
      var l = coreIssues();
      for (var i = 0; i < l.length; i++) {
        if ((l[i].keys || []).indexOf(key) !== -1) { core = l[i]; break; }
      }
    }
    if (core) return { core: core, focusKey: key, standalone: false };
    // ── UNDER NO CORE, AND STILL REAL ───────────────────────────────────────
    // A BACKSTOP, NOT A LANE ANY MORE. Returning nothing here was once a bug of
    // the worst kind: the desk printed the record lane's OWN no-vehicle sentence,
    // so a failure of this lookup came out wearing the floor's words and read as
    // "the record holds nothing on public lands". It does hold something. What was
    // missing was a parent — and as of September 2026 every published key has one,
    // which scripts/test-issue-family.mjs enforces. So this branch is unreachable
    // for anything the register publishes; it survives for the case it was always
    // right about, a key that arrives from data older than the table.
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

  // ══════════════════════════════════════════════════════════════════════════
  // THE RECORD LEDGER · what an issue's formal file actually says, per person
  // ══════════════════════════════════════════════════════════════════════════
  // WHAT WAS WRONG. Picking an issue produced a list ordered by acts on file and
  // captioned with two counts — "5 formal acts on file · 2 receipts" — and that is
  // an inventory, not a reading. It told a reader HOW MUCH record each person has
  // on the issue and refused to say WHAT IT DID. Which is the one question an issue
  // desk exists to answer: who moved this, who cut against it, who ran both ways,
  // and who only ever touched it folded inside something larger.
  //   Worse, the surface that DOES characterise the same rows — the Eye's issue
  // answer — leads with "ranked by consistency · who backs up their words first",
  // which is the word-vs-action lane wearing the issue desk's clothes. A person
  // with no stated position on an issue cannot be inconsistent about it, so that
  // ordering silently sorts the formal record by whether we happen to hold a quote.
  //
  // WHAT THIS IS. One key at a time, the formal-pattern index's own read of every
  // person who has a readable formal row on it, filed into the index's own bands in
  // the index's own words — via PDXConsistency.formalPatternIndex.rowFor(pid, key),
  // which is literally the builder the person file's 🏛 formal brief prints from.
  // There is no second characterisation here and there must never be one: if the
  // ledger and the person file ever disagree about a row, that is one bug upstream
  // of both, not two surfaces to reconcile.
  //
  // WHAT IT IS NOT, and these are walls rather than preferences:
  //   · NOT A RANKING. The bands are a partition — clearest formal pattern first,
  //     the person file's fixed order. Inside a band the deeper record leads and
  //     the name breaks the tie. Nothing sorts on party, on a stated position, on
  //     "backs up their words", or on any number derived from those.
  //   · NO PERCENTAGE, EVER. Every figure printed here is an integer a reader can
  //     count for themselves off the rows below it.
  //   · STATED POSITIONS DO NOT ENTER THE TALLIES. A stance may appear as a tag on
  //     a row where a real stance card exists. It cannot order the list, cannot
  //     head a section, and cannot change a band.
  //   · THIN STAYS THIN, SPLIT STAYS SPLIT. The tail is folded when it is long, and
  //     folded is not hidden: the census above says how many rows are in it and
  //     what kind of nothing they hold.
  //   · PACKAGE-BORNE IS DISCLOSED, NOT DEMOTED. A vote carried inside a larger
  //     measure is a vote. It bands on what it did and wears the vehicle lane's
  //     own sentence beside it, and it is counted ACROSS the bands rather than
  //     pulled out of one. See the wall over _vehLine in consistency.js.
  //   · DIRECTION MATCH IS NOT HERE AT ALL. Not as a headline, not as a column,
  //     not as a sort term.

  // The shipped /compare cap, and the reason this warms in batches at all — see
  // WARMING THE FIELD below.
  var COMPARE_CAP = 8;
  var LEDGER_CAP = 24;    // people printed per band set, before the "more" line

  function fpi() {
    try {
      var F = window.PDXConsistency && window.PDXConsistency.formalPatternIndex;
      return (F && fn(F.rowFor) && fn(F.band) && F.LEDGER_BANDS) ? F : null;
    } catch (e) { return null; }
  }
  // How long a tail has to be before folding it earns its tap. The person file's
  // own threshold, read from the index rather than restated here, so the two
  // surfaces fold at the same length.
  function tailMin() {
    var F = fpi();
    var n = F && F.TAIL_MIN;
    return (typeof n === 'number' && n > 0) ? n : 4;
  }
  function vehRead(pid, key) {
    try {
      var V = window.PDXConsistency && window.PDXConsistency.vehicle;
      return (V && fn(V.read)) ? (V.read(pid, key) || null) : null;
    } catch (e) { return null; }
  }

  // ── WARMING THE FIELD ─────────────────────────────────────────────────────
  // THE MISMATCH THIS CLOSES. The issue desk discovers its field through the
  // ISSUE-SCOPED read (PDXVotingRecord.fetchIssueRecords, one request for every
  // tracked member on one key) and issue-view.js keeps those items in its own
  // cache — deliberately, because a slice of one issue must never be mistaken for
  // a member's whole record. But the formal-pattern index reads a member's WHOLE
  // record, through PDXVotingRecord.memberRecords, and it has to: the coverage
  // floor that stops two roll calls being read as a pattern is a fact about how
  // much of that member's record we hold, and an issue slice cannot know it.
  //   So asking rowFor() for a pid the issue read just discovered answers null,
  // and the ledger would print an empty band set over a key that has formal acts
  // on file. That is the same failure this pass exists to close, wearing a
  // different sentence.
  //
  // THE FIX IS THE SHIPPED BATCH, NOT A NEW READ. /compare takes up to eight
  // members in one request, returns each one's full record, and seeds the same
  // per-member cache a profile visit would — it is what the comparison board
  // already uses for exactly this reason. The ledger asks for the people it is
  // about to print, in batches of eight, once per visit per person, and repaints
  // when the batch lands. Nothing here derives a direction, and nothing here is
  // stored: it makes the record warm and then asks the index the same question the
  // person file asks.
  //
  // AND IT NEVER PRESENTS A COLD ROW AS AN EMPTY ONE. A person whose record has
  // not landed yet is counted as still reading, out loud, above the bands. "No
  // formal row on this key" is a finding, and a finding may not be produced by a
  // request that has not come back.
  var _warmAsked = {}, _warmWait = 0;
  function recordWarm(pid) {
    try {
      var V = window.PDXVotingRecord;
      return !!(V && fn(V.memberRecords) && V.memberRecords(pid));
    } catch (e) { return false; }
  }
  function warmLedger(pids) {
    var V = window.PDXVotingRecord;
    if (!V || !fn(V.fetchCompare)) return;
    var ask = [];
    (pids || []).forEach(function (pid) {
      if (!pid || _warmAsked[pid]) return;
      _warmAsked[pid] = 1;
      if (!recordWarm(pid)) ask.push(pid);
    });
    if (!ask.length) return;
    for (var i = 0; i < ask.length; i += COMPARE_CAP) {
      (function (batch) {
        var p = null;
        _warmWait++;
        try { p = V.fetchCompare(batch); } catch (e) { p = null; }
        if (!p || !fn(p.then)) { _warmWait--; return; }
        p.then(done, done);
      })(ask.slice(i, i + COMPARE_CAP));
    }
    // ONE REPAINT PER SETTLED FIELD, not one per batch: a three-batch ledger
    // repainting three times is three reflows and two flashes of a shorter list.
    function done() {
      _warmWait--;
      if (_warmWait > 0) return;
      try { if (_live) sync(); } catch (e) {}
    }
  }
  function ledgerPending() { return _warmWait > 0; }

  // ── ONE ACT'S DIRECTION ON THIS KEY ───────────────────────────────────────
  // For the measure rows only, and through the engine's own function — the same
  // _voteEffectiveSupport the direction index uses, including its procedural
  // inversion, so a Nay on a motion to table reads here exactly as it reads
  // there. true → advanced it, false → cut against it, null → took no side.
  // No second rule about what a vote means lives in this file.
  function actSide(item, key) {
    var m = null;
    ((item && item.issues) || []).forEach(function (g) {
      if (!m && g && g.issueKey === key) m = g;
    });
    if (!m) return undefined;
    var eff;
    try {
      if (!fn(window._voteEffectiveSupport)) return undefined;
      eff = window._voteEffectiveSupport(item, m.supportMeaning);
    } catch (e) { return undefined; }
    return (eff === null || typeof eff === 'undefined') ? null : !!eff;
  }
  function itemsOn(pid, key) {
    try {
      return fn(window._pdxRecordIssueItems) ? (window._pdxRecordIssueItems(pid, key) || []) : [];
    } catch (e) { return []; }
  }
  // Instrument identity, in the same shape voting-record.js and stance-helpers.js
  // both use, so "the same bill" means one thing across the three layers.
  function measureKey(it) {
    if (!it) return '';
    if (it.measureId != null && it.measureId !== '') return 'm:' + it.measureId;
    var n = String(it.number || it.title || '').trim().toLowerCase();
    return n ? 'n:' + n : '';
  }

  // ── MEASURES ON FILE THAT MAP HERE ────────────────────────────────────────
  // Two sources, unioned, because they answer two halves of the same question and
  // neither is complete on its own. The measure index knows every measure whose
  // curation maps it to this key — including the ones nobody in the printed slice
  // has an act on — and the warm records know which acts the people on this ledger
  // actually took. A measure in the index with no act beside it prints its number,
  // its title and its PRIMARY-vs-provision label and says nothing about anyone.
  //   PRIMARY vs PROVISION IS A LABEL ON THE BILL. It is printed because a reader
  // deserves to know whether the measure was about this issue or merely carried it,
  // and it is consulted by nothing: no count, band or order on this pane reads it.
  function ledgerMeasures(rows, key) {
    var byKey = {}, order = [];
    function slot(id, number, title, primary) {
      if (!id) return null;
      if (!byKey[id]) {
        byKey[id] = { id: id, number: number || '', title: title || '',
          primary: !!primary, seen: false, adv: [], opp: [], none: [] };
        order.push(id);
      }
      var s = byKey[id];
      if (!s.number && number) s.number = number;
      if (!s.title && title) s.title = title;
      if (primary) s.primary = true;
      return s;
    }
    measures().forEach(function (b) {
      if (!b) return;
      var keys = (b.issueKeys || []).filter(Boolean);
      if (b.primaryIssue && keys.indexOf(b.primaryIssue) < 0) keys = keys.concat([b.primaryIssue]);
      if (keys.indexOf(key) < 0) return;
      slot(b.measureId != null && b.measureId !== '' ? 'm:' + b.measureId
        : (b.number ? 'n:' + String(b.number).toLowerCase() : ''),
        b.number, b.title || b.shortTitle || '', b.primaryIssue === key);
    });
    (rows || []).forEach(function (r) {
      itemsOn(r.pid, key).forEach(function (it) {
        var side = actSide(it, key);
        if (typeof side === 'undefined') return;
        var m = null;
        (it.issues || []).forEach(function (g) { if (!m && g && g.issueKey === key) m = g; });
        var s = slot(measureKey(it), it.number || '', it.title || '', !!(m && m.isPrimary));
        if (!s) return;
        s.seen = true;
        (side === true ? s.adv : side === false ? s.opp : s.none).push(r.name);
      });
    });
    return order.map(function (id) { return byKey[id]; });
  }

  // ── THE LEDGER MODEL ──────────────────────────────────────────────────────
  // Pure apart from the warm-cache reads it delegates. Every integer below is a
  // count of rows this pane prints, so the census and the bands cannot disagree.
  function issueLedger(core, focusKey) {
    var key = focusKey || '';
    var F = fpi();
    if (!F || !key) return null;
    // The bundle is the caller's if it has one. It usually does — the pane hands
    // over the target it already resolved. Where it does not, the key resolves
    // itself, so a ledger can be asked for by key alone and answers the same way.
    if (!core) { try { core = (resolveIssue(key) || {}).core || null; } catch (e) { core = null; } }
    var people = issuePeople(core, key);
    if (people === null) return null;
    var BASE = '';
    try { BASE = String(window._PDX_ALIGN_BASE_TAG || ''); } catch (e) { BASE = ''; }

    var rows = [], cold = 0;
    people.forEach(function (p) {
      if (!p || !p.id) return;
      if (!recordWarm(p.id)) { cold++; return; }
      var x = null;
      try { x = F.rowFor(p.id, key); } catch (e) { x = null; }
      if (!x) return;
      var band = '';
      try { band = F.band(x) || ''; } catch (e) { band = ''; }
      if (!band) return;
      // The pattern chip, assembled exactly as the person file's formal brief
      // assembles it: the index's label, then the tally it published, then the
      // acts that took no side. `sideCounts` is the split brief's own field — a
      // shallow split withholds `counts` on every chip, and a heading that has
      // already said the record ran both ways is owed the two integers.
      var pat = x.pat || null;
      var n = (x.counts || (pat && pat.sideCounts) || '');
      if (x.noSideCount) n += (n ? ' · ' : '') + x.noSideCount;
      var veh = vehRead(p.id, key);
      rows.push({
        pid: p.id,
        name: p.name || p.id,
        office: p.sub || '',
        band: band,
        label: x.patLabel || '',
        tally: n,
        tone: x.tone || 'muted',
        judged: x.judged || 0,
        held: x.held || 0,
        // The vehicle sentence, on the row that carries it, in the vehicle lane's
        // own words. Presentation only — see the wall over the bands above.
        veh: (veh && veh.line) ? veh.line : '',
        vehNote: (veh && veh.note) ? veh.note : '',
        pkgOnly: !!(x.vehicle && x.vehicle.only),
        // A STATED POSITION, WHERE ONE REALLY EXISTS. A tag, and only a tag: it
        // is appended after the pattern chip, it is not in any count above, and
        // no band, order or figure on this pane reads it.
        stance: (x.said && x.stance) ? String(x.stance) : '',
        // …and its opposite, marked. A row whose read rests on the record with
        // nothing stated to check it against wears the alignment lane's own
        // record-derived tag. It still feeds nothing.
        base: (!x.said && x.read && BASE) ? BASE : ''
      });
    });

    // THE PARTITION, IN THE INDEX'S FIXED ORDER. Inside a band the deeper record
    // leads, then the wider file, then the name — the person file's own tie-break
    // chain, and every term an integer or a locale compare so two renders of the
    // same data never disagree about the order.
    var bands = [];
    F.LEDGER_BANDS.forEach(function (b) {
      var list = rows.filter(function (r) { return r.band === b.id; });
      list.sort(function (a, c) {
        if (a.judged !== c.judged) return c.judged - a.judged;
        if (a.held !== c.held) return c.held - a.held;
        return String(a.name || '').localeCompare(String(c.name || ''));
      });
      bands.push({ id: b.id, lb: b.lb, note: b.note, tail: !!b.tail, rows: list });
    });

    var pkg = rows.filter(function (r) { return r.pkgOnly; }).length;
    var by = {};
    bands.forEach(function (b) { by[b.id] = b.rows.length; });
    var tail = bands.filter(function (b) { return b.tail; })
      .reduce(function (n, b) { return n + b.rows.length; }, 0);
    return {
      key: key, label: issueLabel(key),
      people: rows.length, cold: cold, pkg: pkg, tail: tail,
      by: by, bands: bands,
      measures: ledgerMeasures(rows, key),
      pending: ledgerPending()
    };
  }

  // ── THE CENSUS ────────────────────────────────────────────────────────────
  // Counts, then the partition. No percentage, no share, no grade, and no party
  // anywhere in it — the five band figures sum to the headline by construction,
  // because each is the length of a list printed below.
  // ── THE CRUMB ─────────────────────────────────────────────────────────────
  // Core label → child label, from the family table, printed under the census.
  // It is the sentence that tells a reader where they are: this ledger is one
  // issue, and that issue is filed under one family. Copy only — no count, no
  // share, no order, and it never renames the key it describes.
  function crumbHtml(key) {
    var F = family();
    if (!F || !key) return '';
    var c = null;
    try { c = F.crumb(key); } catch (e) { c = null; }
    if (!c || !c.coreLabel) return '';
    // The crumb takes the child's hue on the whole line, so the family a reader is
    // inside is legible from the colour as well as from the words. Ink only — no
    // fill, because this is a caption under a census and not another control.
    return '<p class="d1-led-crumb"' + skinAttrs(key) + '>' +
      '<button type="button" class="d1-crumb-a" onclick="window.pdxDoor1Issue(\'' +
        jsq(c.core) + '\')">' + esc(c.coreLabel) + '</button>' +
      '<span class="d1-crumb-s" aria-hidden="true">' + esc(F.ARROW || ' \u2192 ') + '</span>' +
      '<span class="d1-crumb-k">' + esc(c.childLabel) + '</span>' +
    '</p>';
  }

  function censusHtml(led) {
    var b = led.by;
    var parts = [];
    if (b.advanced) parts.push(b.advanced + ' advanced');
    if (b.against) parts.push(b.against + ' cut against');
    if (b.both) parts.push(b.both + ' ran both ways');
    if (b.thin) parts.push(b.thin + ' too thin to lean on');
    if (b.none) parts.push(b.none + ' with no side read');
    var m = led.measures.length;
    return '<div class="d1-led-census">' +
      crumbHtml(led.key) +
      '<p class="d1-led-n"><b>' + led.people + '</b> ' +
        (led.people === 1 ? 'person has' : 'people have') +
        ' a readable formal row on <b>' + esc(led.label) + '</b>.</p>' +
      (parts.length ? '<p class="d1-led-split">' + esc(parts.join(' · ')) + '</p>' : '') +
      (led.pkg
        ? '<p class="d1-led-pkg">Of those, <b>' + led.pkg + '</b> touched it only inside a larger ' +
          'measure. That is disclosed on the row, and it did not move anyone out of a band.</p>'
        : '') +
      '<p class="d1-led-m">' + (m ? '<b>' + m + '</b> measure' + (m === 1 ? '' : 's') +
        ' on file map here.' : 'No measure on file is mapped to this key yet.') + '</p>' +
      (led.cold
        ? '<p class="d1-claim-busy" role="status">Reading the full record for ' + led.cold +
          ' more ' + (led.cold === 1 ? 'person' : 'people') + ' on this key…</p>'
        : '') +
    '</div>';
  }

  function ledgerRowHtml(r, key) {
    var chip = '<span class="d1-led-pat is-' + esc(r.tone) + '">' + esc(r.label) +
      (r.tally ? ' <span class="d1-led-t">(' + esc(r.tally) + ')</span>' : '') + '</span>';
    // ONE DOOR, AND IT IS THE SHIPPED ONE. The same delegated dossier gateway the
    // person file's 🏛 formal brief uses, with the same four attributes in the same
    // roles: `dos` is the ISSUE KEY, `pid` is whose file to open, `origin` is the id
    // of the row to come back to, and `focus` asks the dossier to land on the record
    // column rather than the top. So a tap lands on this person's own acts on this
    // key, in the surface that already owns that view — nothing new was engined for
    // it, and the return pill knows where the reader came from.
    var rowId = 'd1-led-' + String(r.pid).replace(/[^a-zA-Z0-9_-]/g, '') + '-' +
      String(key).replace(/[^a-zA-Z0-9_-]/g, '');
    var go = '<button type="button" class="d1-led-go pdxst-open"' +
      ' data-pdxst-dos="' + esc(key) + '" data-pdxst-pid="' + esc(r.pid) + '"' +
      ' data-pdxst-origin="' + esc(rowId) + '" data-pdxst-focus="record"' +
      ' aria-label="' + esc(r.name + ' — formal record: ' + (r.label || 'on file') +
        (r.tally ? ' (' + r.tally + ')' : '') + '. Open the acts behind it.') +
      '">Open the acts</button>';
    return '<li class="d1-led-p" id="' + esc(rowId) + '" data-pdx-led-band="' + esc(r.band) + '">' +
      '<span class="d1-led-hd">' +
        personLink(r.pid, r.name, 'd1-led-a') +
        (r.office ? '<span class="d1-led-o">' + esc(r.office) + '</span>' : '') +
      '</span>' + chip +
      (r.base ? '<span class="d1-base">' + esc(r.base) + '</span>' : '') +
      (r.stance ? '<span class="d1-led-say">💬 Stated: ' + esc(r.stance) + '</span>' : '') +
      (r.veh ? '<span class="d1-led-veh" title="' + esc(r.vehNote) + '">🚂 ' + esc(r.veh) + '</span>' : '') +
      go +
    '</li>';
  }

  function bandHtml(band, key) {
    if (!band.rows.length) return '';
    var head = '<div class="d1-led-bh"><span class="d1-led-bt">' + esc(band.lb) + '</span>' +
      '<span class="d1-led-bn">' + band.rows.length + '</span></div>' +
      '<p class="d1-led-bnote">' + esc(band.note) + '</p>';
    // ── THE OVERFLOW STAYS IN THE BAND ────────────────────────────────────────
    // A long band folds its remainder here rather than handing the reader off to
    // the ranked overlay. That overlay orders by consistency — word against action
    // — which is a real reading and the wrong one to inherit halfway down a band
    // filed by formal pattern. Continuing a list must not silently re-sort it, so
    // the rest of the band opens in place, in the same order, under a count.
    var shown = band.rows.slice(0, LEDGER_CAP);
    var rest = band.rows.slice(LEDGER_CAP);
    var list = '<ul class="d1-led-people">' + shown.map(function (r) {
      return ledgerRowHtml(r, key);
    }).join('') + '</ul>' +
      (rest.length
        ? '<details class="d1-led-more"><summary class="d1-led-msum">' + rest.length +
          ' more in this band — same reading, same order</summary>' +
          '<ul class="d1-led-people">' + rest.map(function (r) {
            return ledgerRowHtml(r, key);
          }).join('') + '</ul></details>'
        : '');
    return '<section class="d1-led-band is-' + esc(band.id) + '">' + head + list + '</section>';
  }

  // The tail: thin reads and unread rows, under one control, with the census of
  // what is inside it printed on the control itself. Folded only once it is long
  // enough that folding saves more than the tap costs — the person file's own
  // threshold — and never dropped, so a find-in-page and a deep link still land.
  function tailHtml(led, key) {
    var tails = led.bands.filter(function (b) { return b.tail && b.rows.length; });
    if (!tails.length) return '';
    var inner = tails.map(function (b) { return bandHtml(b, key); }).join('');
    if (led.tail < tailMin()) return inner;
    var say = tails.map(function (b) { return b.rows.length + ' ' + b.lb.toLowerCase(); }).join(' · ');
    return '<details class="d1-led-tail"><summary class="d1-led-tsum">' +
      '<b>' + led.tail + '</b> more on file — ' + esc(say) +
      '</summary>' + inner + '</details>';
  }

  function measuresHtml(led) {
    if (!led.measures.length) return '';
    function who(lbl, names) {
      if (!names.length) return '';
      var head = names.slice(0, 3).join(', ');
      var rest = names.length > 3 ? ' +' + (names.length - 3) + ' more' : '';
      return '<span class="d1-led-w">' + esc(lbl) + ': ' + esc(head + rest) + '</span>';
    }
    return '<section class="d1-led-meas">' +
      '<div class="d1-led-bh"><span class="d1-led-bt">Measures on file</span>' +
        '<span class="d1-led-bn">' + led.measures.length + '</span></div>' +
      '<p class="d1-led-bnote">PRIMARY means the measure was about this issue; a provision means it ' +
        'carried it inside something larger. Either way the vote counts — the label is here so you ' +
        'can see which it was.</p>' +
      '<ul class="d1-led-bills">' + led.measures.slice(0, LIST_CAP).map(function (m) {
        var sides = who('Advanced it', m.adv) + who('Cut against it', m.opp) + who('No side recorded', m.none);
        return '<li class="d1-led-b">' +
          '<span class="d1-led-bnum">' + esc(m.number || m.title || 'On file') + '</span>' +
          // A record row often carries no title beyond its own number, and printing
          // the number twice reads as a title nobody wrote. Withheld when it adds
          // nothing; never substituted with a guess at what the measure was about.
          (m.title && m.title !== m.number
            ? '<span class="d1-led-btitle">' + esc(m.title) + '</span>' : '') +
          '<span class="d1-led-btag' + (m.primary ? ' is-primary' : '') + '">' +
            (m.primary ? 'PRIMARY' : 'provision') + '</span>' +
          (sides ? '<span class="d1-led-bwho">' + sides + '</span>' : '') +
          (m.number
            ? '<button type="button" class="d1-cite" onclick="window.pdxDoor1Bill(\'' +
              jsq(m.number) + '\')">Who voted on it</button>'
            : '') +
        '</li>';
      }).join('') + '</ul>' +
      (led.measures.length > LIST_CAP
        ? '<p class="d1-more">' + (led.measures.length - LIST_CAP) + ' more mapped to this key.</p>'
        : '') +
    '</section>';
  }

  // The one sentence that keeps this pane out of the score — the formal-pattern
  // index's own wall, printed once at the foot rather than on every row.
  function ledgerWall() {
    try {
      var F = fpi();
      if (F && F.WALL) return String(F.WALL);
    } catch (e) {}
    return '';
  }

  function ledgerHtml(led) {
    var key = led.key;
    var head = censusHtml(led);
    if (!led.people) {
      // NOT AN EMPTY RECORD WHILE A READ IS OUT. Only once every person the issue
      // read discovered has a warm record may this pane say the key holds nothing.
      var busy = led.cold || led.pending;
      return head + (busy
        ? '<p class="d1-claim-busy" role="status">Reading the roll-call record for this issue…</p>'
        : '<p class="d1-empty">' + esc(emptyIssueNote()) + '</p>') + measuresHtml(led);
    }
    var open = led.bands.filter(function (b) { return !b.tail; })
      .map(function (b) { return bandHtml(b, key); }).join('');
    var wall = ledgerWall();
    return head +
      // The two orderings this list is NOT. Said without naming a caucus, because
      // no token of that field is allowed into this desk's markup at all — see the
      // header note. What the sentence promises is what the comparator does.
      '<p class="d1-lead">Filed by what the formal record on this key did — clearest pattern first. ' +
      'Not by which side of the aisle anyone sits on, and not by whether we hold a quote on it.</p>' +
      open + tailHtml(led, key) + measuresHtml(led) +
      (wall ? '<p class="d1-led-wall">' + esc(wall) + '</p>' : '');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE ISSUE FILE · one function, two doors
  // ══════════════════════════════════════════════════════════════════════════
  // The person file is /p/<pid>. The issue file is /i/<key>. Until this pass the
  // second address did not exist: the ledger above — crumb, census, bands, tail,
  // measures — was reachable only from inside this desk, so the Eye, the person
  // file's topic tree and a share sheet had nowhere to send a reader who wanted
  // THE ISSUE rather than one person's row on it. PDXIssueFamily.profileUrl(key)
  // named the address that ledger would have and said out loud that nothing
  // routed it. This is the pass that routes it.
  //
  // The fix is NOT a second ledger, a second skin or an issue-shaped page. It is
  // this function: the body the desk already painted, lifted out of
  // issueDeskHtml() unchanged, so pdx-issue-profile.js can mount at /i/<key> the
  // same string a chip tap mounts here. There is no visual fork available to
  // drift, because there is only one builder.
  //
  // IN: one ISSUE_MAP key, exactly as given — resolveIssue does the parent lookup
  // and nothing rounds a key to a cousin. OUT: the scope sentence, the crumb, the
  // census, the bands, the folded tail, the measures on file and the formal
  // lane's own wall, every one of them a call into the helpers this desk has
  // always used. No percentage, no party token, no Direction Match, and nothing
  // characterised here that the formal-pattern index did not publish.
  //
  // A BUNDLE KEY ANSWERS ''. One of the thirteen resolves to a core with no focus
  // key, and a bundle has no single record to read — which key inside it a reader
  // meant is theirs to say, on the sub-key shelf. The desk handles that case
  // below (the bundle overview), and a caller that gets '' has been told honestly
  // that there is no ONE ledger at that address rather than handed a merged one.
  function issueProfileHtml(key) {
    var t = null;
    try { t = resolveIssue(key); } catch (e) { t = null; }
    if (!t || !t.focusKey) return '';
    var core = t.core, focusKey = t.focusKey;
    var scope;
    if (t.standalone) {
      // No bundle to name, and no bundle invented for it. This is the sentence
      // that keeps a fourteenth list from looking like a bug in the shelf.
      scope = '<p class="d1-scope">Scoped to <b>' + esc(issueLabel(focusKey)) +
        '</b> alone — it is not inside any of the tracked issues above, so only its own ' +
        'record is read here.</p>';
    } else {
      scope = '<p class="d1-scope">Scoped to <b>' + esc(issueLabel(focusKey)) + '</b>, inside ' +
        esc(core.label) + ' — not the whole bundle.</p>';
    }
    var led = issueLedger(core, focusKey);
    if (!led) {
      return scope +
        '<p class="d1-empty">The formal-record index is not loaded on this page, so this desk cannot ' +
        'read the bands. Nothing was characterised.</p>';
    }
    // The people the ledger is about to read, warmed in batches. Asked here
    // rather than in pdxDoor1Issue because the field is only known once
    // buildRanking has run, and it re-asks after each repaint for the pids a
    // later batch added — once per person per visit, never per paint.
    try {
      var field = issuePeople(core, focusKey) || [];
      warmLedger(field.map(function (p) { return p && p.id; }));
    } catch (e) {}
    return scope + ledgerHtml(led);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OPEN ANY TRACKED KEY
  // ══════════════════════════════════════════════════════════════════════════
  // The shelf stays thirteen cores, because thirteen is what a reader can scan.
  // What thirteen chips cannot be is the whole register — 121 keys — so the desk
  // also carries a control that opens ANY tracked key by name. Every published key
  // now also sits under exactly one core (see the parent table in
  // alignment-tool.js), so seek and the chips are two ways to the same child: the
  // shelf is the browse path, this is the direct one, and both commit the exact
  // key. Nothing here rounds a query to a cousin key to make an answer.
  //
  // WHAT RESOLVES, IN ORDER, AND WHY EACH RUNG IS SAFE:
  //   1 · the key exactly — `lands_preserve`.
  //   2 · the key stemmed, so a reader who types words rather than a slug still
  //       lands: "land preserve" and "lands preserve" both normalise to the same
  //       thing `lands_preserve` does. This is the rung the smoke asks for.
  //   3 · the label exactly, stemmed the same way — "Protect Public Lands".
  //   4 · a core bundle's key or label, so the shelf's own names keep working.
  //   5 · the label CONTAINING the query — "public lands" inside "Protect Public
  //       Lands". Two keys can match that, so the shortest label wins (the most
  //       specific match) and the key breaks the tie alphabetically. Deterministic,
  //       and documented here because a resolver whose answer depends on object
  //       key order is a resolver that changes answer when the register is edited.
  //   6 · a curated keyword, exactly, and ONLY when exactly one key claims it.
  //       Keywords overlap heavily by design — 'climate' is on four keys — so an
  //       ambiguous keyword resolves to nothing rather than to a guess.
  // Nothing here invents a key. A query that matches no rung resolves to null and
  // the pane says so in its own words, which is the honest answer for a phrase the
  // register does not carry.
  function normKey(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
      .map(function (w) { return w.replace(/ies$/, 'y').replace(/(?:es|s)$/, ''); })
      .filter(Boolean).join('');
  }
  function issueMap() {
    try {
      var m = window.ISSUE_MAP;
      return (m && typeof m === 'object') ? m : null;
    } catch (e) { return null; }
  }
  function trackedKeys() {
    var m = issueMap();
    if (!m) return [];
    var out = [];
    Object.keys(m).forEach(function (k) { if (shippedIssue(k)) out.push(k); });
    out.sort();
    return out;
  }
  function issueKeyFor(query) {
    var m = issueMap();
    var raw = String(query == null ? '' : query).trim();
    if (!raw) return '';
    if (m && shippedIssue(raw)) return raw;                       // 1
    var q = normKey(raw);
    if (!q) return '';
    var keys = trackedKeys(), i;
    for (i = 0; i < keys.length; i++) if (normKey(keys[i]) === q) return keys[i];   // 2
    for (i = 0; i < keys.length; i++) if (normKey(issueLabel(keys[i])) === q) return keys[i];  // 3
    var cores = coreIssues();                                     // 4
    for (i = 0; i < cores.length; i++) {
      if (normKey(cores[i].key) === q || normKey(cores[i].label) === q) return cores[i].key;
    }
    var best = '', bestLen = 0;                                   // 5
    for (i = 0; i < keys.length; i++) {
      var lb = normKey(issueLabel(keys[i]));
      if (!lb || lb.indexOf(q) < 0) continue;
      if (!best || lb.length < bestLen) { best = keys[i]; bestLen = lb.length; }
    }
    if (best) return best;
    var hit = '', many = false;                                   // 6
    for (i = 0; i < keys.length; i++) {
      var kws = (m && m[keys[i]] && m[keys[i]].keywords) || [];
      for (var j = 0; j < kws.length; j++) {
        if (normKey(kws[j]) !== q) continue;
        if (hit && hit !== keys[i]) many = true;
        else hit = keys[i];
        break;
      }
    }
    return (hit && !many) ? hit : '';
  }

  var K_SEEK = 'pdx_d1_seek';
  function seekHtml() {
    var keys = trackedKeys();
    if (!keys.length) return '';
    var miss = sget(K_SEEK);
    var opts = keys.map(function (k) {
      return '<option value="' + esc(k) + '" label="' + esc(issueLabel(k)) + '"></option>';
    }).join('');
    return '<form class="d1-seek" onsubmit="return window.pdxDoor1IssueSeek(this.elements.q.value);">' +
      '<label class="d1-seek-l" for="d1-seek-q">Open any tracked key' +
        '<span class="d1-seek-n">' + keys.length + ' on file</span></label>' +
      '<span class="d1-seek-row">' +
        '<input id="d1-seek-q" name="q" class="d1-seek-i" type="text" list="d1-seek-keys"' +
          ' autocomplete="off" spellcheck="false"' +
          ' placeholder="lands_preserve · Protect Public Lands · land preserve">' +
        '<datalist id="d1-seek-keys">' + opts + '</datalist>' +
        '<button type="submit" class="d1-seek-go">Open</button>' +
      '</span>' +
      (miss
        ? '<p class="d1-seek-miss" role="status">The register carries no key for “' + esc(miss) +
          '”. Nothing was approximated — try a key, its label, or pick from the list.</p>'
        : '<p class="d1-seek-h">Every tracked key sits under one of the thirteen. Opening one by name ' +
          'commits that exact key and names the family it belongs to.</p>') +
    '</form>';
  }

  // ── THE SUB-KEY SHELF ─────────────────────────────────────────────────────
  // A bundle is thirteen curated groups of keys, and the ledger reads ONE key: a
  // person's formal record on `housing` and on `tariffs_china` are two different
  // records and merging them into a bundle-level band would be a characterisation
  // nothing in the engine produced. So a bundle prints its member keys and the
  // reader picks the one they came for. Nothing is chosen for them — picking a
  // default key would be this desk deciding which part of a bundle a reader meant.
  // THE CHILDREN COME FROM THE TABLE, IN THE TABLE'S ORDER. Asked of
  // PDXIssueFamily rather than read off the core object, so the chips a core
  // paints are exactly the keys the parent table files under it — that is what
  // put `lands_preserve`, `lands_keep_public`, `lands_balance` and `lands_local`
  // on the Climate, Energy & Land branch, each as its own chip. Four questions
  // about the public estate, four keys, four chips: nothing is merged onto one
  // chip and no chip stands for two poles.
  function childKeys(core) {
    var F = family();
    if (F && core && core.key) {
      try {
        var kids = F.childrenOf(core.key) || [];
        if (kids.length) return kids.filter(shippedIssue);
      } catch (e) {}
    }
    return ((core && core.keys) || []).filter(shippedIssue);
  }
  function subKeyShelf(core, focusKey) {
    var keys = childKeys(core);
    if (keys.length < 2) return '';
    return '<div class="d1-shelf d1-shelf-keys" role="group" aria-label="Keys inside ' +
      esc(core.label) + '">' + keys.map(function (k) {
        return '<button type="button" class="d1-chip is-key' + (k === focusKey ? ' is-open' : '') + '"' +
          skinAttrs(k) +
          ' onclick="window.pdxDoor1Issue(\'' + jsq(k) + '\')">' + esc(issueLabel(k)) + '</button>';
      }).join('') + '</div>';
  }

  function issueDeskHtml() {
    var head = deskHead('Open an issue', 'Pick one. Then: what the formal record on it did, and who did it.');
    var list = coreIssues();
    if (!list.length) {
      return head + '<p class="d1-empty">The issue set is not loaded on this page yet.</p>';
    }
    var picked = sget(K_ISSUE);
    var t = resolveIssue(picked);
    var core = t && t.core;
    var focusKey = (t && t.focusKey) || '';
    // The cores carry their own hue too — CORE_ISSUE_COLORS is keyed by core id, so
    // the same skinAttrs() call answers for a bundle and for a leaf and no core-id
    // branch was needed here or in issue-colors.js.
    var shelf = '<div class="d1-shelf" role="group" aria-label="Tracked issues">' + list.map(function (c) {
      return '<button type="button" class="d1-chip' + (core && c.key === core.key ? ' is-open' : '') + '"' +
        skinAttrs(c.key) +
        ' onclick="window.pdxDoor1Issue(\'' + jsq(c.key) + '\')">' + esc(c.label) + '</button>';
    }).join('') + '</div>' + seekHtml();
    if (!core) {
      if (picked) {
        // A key we hold no bundle for. Nothing is listed and nothing is
        // approximated: the honest empty is the floor's own no-vehicle sentence.
        return head + shelf + '<p class="d1-empty">' + esc(emptyIssueNote()) + '</p>';
      }
      return head + shelf + '<p class="d1-lead">Pick an issue above.</p>';
    }

    var keyShelf = subKeyShelf(core, focusKey);

    // ── THE ISSUE FILE, WHERE A KEY IS ACTUALLY SELECTED ────────────────────
    // The scope sentence, the crumb, the census, the bands, the tail and the
    // measures are ONE function now — issueProfileHtml(key), above — because that
    // body also has an address of its own: /i/<key>. Two doors, one paint. What
    // stays here is the DESK's own chrome: the head, the thirteen chips, the seek
    // control and the sibling-key shelf. See the note over the function.
    if (focusKey) return head + shelf + keyShelf + issueProfileHtml(focusKey);

    // ── THE BUNDLE OVERVIEW ─────────────────────────────────────────────────
    // No key selected yet, so no band set: what this can honestly report is the
    // inventory — who holds something formal somewhere inside the bundle — and
    // the way in to the reading, which is the key shelf above.
    var V = issueView();
    var pending = false;
    try { pending = !!(V && fn(V.votesPending) && V.votesPending()); } catch (e) { pending = false; }

    var people = issuePeople(core, '');
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
        ? '<p class="d1-more">' + (people.length - LIST_CAP) + ' more with a formal row somewhere in ' +
          'this bundle — <button type="button" class="d1-link" onclick="window.pdxDoor1IssueFace(\'' +
          jsq(core.key) + '\')">open the full ' + esc(core.label) + ' ledger</button>.</p>'
        : '');
    }
    // (No scope sentence here, and there never was one: `scope` named a SELECTED
    // key, which is exactly what this branch does not have. It now lives inside
    // issueProfileHtml, where the key is known.)
    return head + shelf + keyShelf +
      '<p class="d1-lead">Pick a key above to read what the record on it did. Until then this is the ' +
      'inventory: who holds something formal somewhere inside ' + esc(core.label) + ', deepest file ' +
      'first. Not a reading, and not a match score.</p>' + body;
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
    // A remembered arrival is spent HERE and nowhere else — after _live, and
    // after views() has painted the stubs. Both matter: before _live the desk is
    // not on the page to be landed on, and before views() the section the reader
    // came from is still standing at full height above it, which moves the ground
    // the landing was measured against.
    if (_pending) { var _p = _pending; _pending = ''; scrollDesk('h:' + _p); }
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
    // THE MODE COMES FROM THE MAP, NOT FROM THE STRIP. modeForWorkId() is the
    // same function the hash arrival uses, so the control on a stub and a deep
    // link to the section under it cannot land on different modes. `view.mode`
    // is only the fallback for a call that hands over a view this table does not
    // list, which VIEWS itself never does.
    var mode = modeForWorkId(view.id) || view.mode;
    var m = modeOf(mode) || {};
    return '' +
      '<div class="d1-view-strip">' +
        '<span class="d1-view-kick">A VIEW of the Door 1 workspace</span>' +
        '<span class="d1-view-name">' + esc(title || view.label) + '</span>' +
        '<span class="d1-view-job">' + esc(view.job) + '</span>' +
        '<button type="button" class="d1-view-open"' +
          ' data-d1-view="' + esc(view.id) + '" data-d1-to="' + esc(mode) + '"' +
          ' onclick="return window.PDXDoor1.toDesk(\'' + jsq(mode) + '\');"' +
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
  // ── WHERE AN ARRIVAL LANDS ────────────────────────────────────────────────
  // One node, and it is the desk's own mount. Stated as a function with a wall
  // in it rather than as `el(AUTHORITY)` inline, because the two wrong answers
  // are both live ids on this page and both were reachable before: a WORK_ID
  // section, which is ONE LINE once the desk has painted and collapsed it, and
  // Door 2's workspace, which belongs to the election loop and is nobody's
  // Door 1 destination. Neither can be returned from here.
  var NEVER = ['pdx-ballot-workspace', 'pdx-door2-spine',
    'hero-receipt', 'say-vs-do', 'issue-front-door', 'hr1-showcase'];
  function deskNode() {
    if (NEVER.indexOf(AUTHORITY) >= 0) return null;   // unreachable by construction
    var mount = el(AUTHORITY);
    if (mount) return mount;
    // No mount, but a painted desk card: land on the card itself rather than
    // give up and leave the reader wherever the router put them.
    var body = el(BODY_ID);
    if (!body) return null;
    try {
      var card = body.querySelector && body.querySelector('.d1-desk');
      if (card) return card;
    } catch (e) {}
    return body;
  }

  // ── CLEARANCE FOR THE FIXED NAV ───────────────────────────────────────────
  // app.css states html{scroll-padding-top: calc(var(--pdx-chrome) + 0.5rem)},
  // and index.html MEASURES --pdx-chrome off the bottom of the nav's Eye row, so
  // every scrollIntoView on this page already comes to rest below the fixed bar
  // rather than under it. That is the primary path here, and reading the same
  // property for the fallback is deliberate: one number for the whole page, so
  // the desk cannot land at a different height from every other jump on it.
  function chromePx() {
    var raw = '';
    try {
      var root = document.documentElement;
      if (root && root.style && root.style.getPropertyValue) raw = root.style.getPropertyValue('--pdx-chrome');
      if (!raw && window.getComputedStyle) raw = window.getComputedStyle(root).getPropertyValue('--pdx-chrome');
    } catch (e) { raw = ''; }
    var n = parseFloat(String(raw || ''));
    if (!isFinite(n) || n <= 0) return 0;
    if (/r?em/.test(String(raw))) n = n * 16;     // the page's own root size
    return n + 8;                                  // the +0.5rem the sheet adds
  }
  function landOn(node) {
    if (!node) return;
    var padded = true;
    try { padded = !!(window.CSS && window.CSS.supports && window.CSS.supports('scroll-padding-top', '1px')); }
    catch (e) { padded = true; }
    if (!padded && node.getBoundingClientRect && window.scrollTo) {
      var top = 0;
      try {
        top = node.getBoundingClientRect().top +
          (window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0) -
          chromePx();
      } catch (e) { top = -1; }
      if (top >= 0) {
        try { window.scrollTo({ top: top, behavior: 'smooth' }); return; }
        catch (e) { try { window.scrollTo(0, top); return; } catch (e2) {} }
      }
    }
    if (!node.scrollIntoView) return;
    try { node.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (e) { try { node.scrollIntoView(true); } catch (e2) {} }
  }

  // The same settle pattern index.html's router uses, for the same reason: the
  // four sections below the desk carry content-visibility:auto, so the browser
  // measures them at a placeholder height on the first frame and the offset
  // computed then can be far off once they render — and the desk's own body is
  // being painted in the same tick. So the scroll is re-issued while the ground
  // is still MOVING and stops the moment it holds still: at most three attempts
  // inside a second, short enough never to fight a reader who has started
  // scrolling somewhere else themselves.
  //
  // The dedupe below is keyed on WHICH arrival asked, not on the clock alone. It
  // exists because one entrance can call in twice — index.html's land() and this
  // file's own hashchange listener both answer the same hash — and a time-only
  // guard also swallowed the next DIFFERENT arrival if it came fast, which is a
  // reader tapping one stub and then another and watching the second do nothing.
  var _land = { key: '', at: 0 };
  function scrollDesk(key) {
    key = String(key == null ? ('m:' + (sget(K_MODE) || '')) : key);
    var now = Date.now ? Date.now() : +new Date();
    if (_land.key === key && (now - _land.at) < 250) return;
    _land.key = key; _land.at = now;
    var tries = 0, prev = null;
    function step() {
      var node = deskNode();
      if (!node) return;
      if (!node.getBoundingClientRect) { landOn(node); return; }
      var top;
      try {
        top = node.getBoundingClientRect().top +
          (window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0);
      } catch (e) { landOn(node); return; }
      if (prev !== null && Math.abs(top - prev) < 24) return;   // settled
      prev = top;
      landOn(node);
      if (++tries >= 3) return;
      try { setTimeout(step, tries === 1 ? 320 : 700); } catch (e) {}
    }
    if (window.requestAnimationFrame) {
      try { window.requestAnimationFrame(function () { setTimeout(step, 40); }); return; } catch (e) {}
    }
    try { setTimeout(step, 60); } catch (e) { step(); }
  }
  // The old name, kept because it is what every mode change on this desk calls.
  function scrollHere() { scrollDesk(); }

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

  // ══════════════════════════════════════════════════════════════════════════
  // ARRIVAL · a WORK_ID hash lands on the desk, in the mode that hash means
  // ══════════════════════════════════════════════════════════════════════════
  // WHAT WAS WRONG. index.html's hash handler opened the work layer and scrolled
  // to the SECTION the hash named. That was right while those sections were
  // chapters; it stopped being right the moment the desk collapsed them, because
  // the thing the reader then arrived at was a single line saying "a view of the
  // Door 1 workspace" — sitting immediately above Door 2's headline, which is
  // what filled their screen. Meanwhile the mode was set by a wrapper on the
  // router, so whether the rail agreed with the URL depended on whether this
  // deferred script had booted before that handler ran. Cold, it often had not,
  // and the rail kept whatever mode the session was last left on.
  //
  // WHAT HAPPENS NOW. The hash is read here, on load and on every change, and
  // one function does all four things in one order that cannot come apart:
  // open the layer (so the section still paints, so the stub still has its own
  // title to show), set the mapped mode, paint the desk, land on the desk.
  //
  // A hash that is not a WORK_ID leaves this function immediately and takes no
  // scroll with it.
  var _arr = { id: '', t: 0 };
  var _pending = '';
  function arrive(id, opts) {
    id = String(id == null ? '' : id).replace(/^#/, '');
    var mode = modeForWorkId(id);
    if (!mode) return false;
    // No mount means no desk on this page — an older cached index.html, or any
    // page carrying the four surfaces without the desk. There the sections are
    // standing at full height and the section IS the honest destination, so the
    // shipped router keeps the arrival and this says so by answering false.
    if (!el(AUTHORITY)) return false;
    var now = Date.now ? Date.now() : +new Date();
    // A click on an anchor and the hashchange that same click causes are ONE
    // arrival. Without this the second one restarts the scroll mid-flight, and
    // it would also cancel a still-pending first arrival.
    if (_arr.id === id && (now - _arr.t) < 700) return true;
    _arr.id = id; _arr.t = now;
    // The layer opens and the surface gets its chance to paint — the stub reads
    // its title off the section's own heading, and a section that never painted
    // has no heading to read. `noScroll` is the whole of what changed on the
    // router's side: it does everything it did except take the reader to a stub.
    if (fn(window.pdxDoorWork)) {
      try { window.pdxDoorWork(id, { noScroll: true }); } catch (e) {}
    }
    // The mode goes in whether or not a desk can paint yet, so the rail is
    // already on the right item the first time one can.
    sset(K_MODE, mode);
    markUsed(mode);
    _pending = id;
    sync();          // consumes _pending and lands, if a desk actually painted
    settle(0);       // and keeps the arrival alive while none has
    return true;
  }

  // THE ARRIVAL IS REMEMBERED, NOT DROPPED. This desk is a deferred script
  // reading five other deferred modules, so a cold hash can genuinely land
  // before anyMode() is true and sync() has anything to paint — and that is the
  // exact window in which the reader used to be parked on a section that then
  // turned into a one-line stub underneath them. So the id is held and every
  // later successful sync() takes it. Four passes inside two seconds; after that
  // there is no desk coming, and the scroll goes back to the router that owns
  // the full-height section.
  var _wait = [120, 400, 900, 1600];
  function settle(tries) {
    if (!_pending) return;
    if (_live) { var _p = _pending; _pending = ''; scrollDesk('h:' + _p); return; }
    if (tries >= _wait.length) {
      var id = _pending;
      _pending = '';
      if (fn(window.pdxDoorWork)) { try { window.pdxDoorWork(id); } catch (e) {} }
      return;
    }
    try {
      setTimeout(function () { sync(); settle(tries + 1); }, _wait[tries]);
    } catch (e) {}
  }

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
    // THE TARGET GOES IN, NOT THE KEY. PDXIssueView.warmVotes takes either, and
    // the target resolveIssue already built is the whole answer — the exact key
    // plus the core the parent table files it under — so it is what gets handed
    // over rather than making a second module resolve the same question again.
    //
    // No callback: the export does not take one, and the desk does not need one.
    // The ledger fires 'pdx-issue-votes' once per batch and boot() re-syncs on it,
    // which is one repaint for two surfaces instead of one repaint each.
    var V = issueView();
    try {
      if (V && fn(V.warmVotes)) V.warmVotes(t.core, t.focusKey || '');
    } catch (e) {}
    // …and, where a key is actually selected, the full record for the people that
    // read has already discovered — the ledger reads the formal-pattern index,
    // and the index reads a member's whole record. See WARMING THE FIELD.
    if (t.focusKey) {
      try {
        warmLedger((issuePeople(t.core, t.focusKey) || []).map(function (p) { return p && p.id; }));
      } catch (e) {}
    }
    if (readMode() !== 'issue') return window.pdxDoor1Open('issue');
    sync();
    return true;
  };

  // The typeahead's submit. Resolves through issueKeyFor and then hands off to
  // the ordinary pick, so a key opened by name is the same pick as a key opened
  // from the shelf — same warm, same note, same ledger. A miss is recorded and
  // said out loud rather than being folded into the nearest bundle.
  window.pdxDoor1IssueSeek = function (text) {
    var raw = String(text == null ? '' : text).trim();
    var key = raw ? issueKeyFor(raw) : '';
    if (!key) { sset(K_SEEK, raw); sync(); return false; }
    sset(K_SEEK, '');
    window.pdxDoor1Issue(key);
    return false;
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
    // The ONE handler behind every "Open in Door 1" control on the page, and the
    // same landing the hash gets: set the mode, paint it, then scroll to the
    // desk — never to the stub the reader just left, and never to Door 2.
    toDesk: function (mode) {
      if (modeOf(mode)) window.pdxDoor1Open(mode);
      else scrollDesk();
      return false;
    },
    // The hash arrival, exported so index.html's router can hand a WORK_ID over
    // instead of scrolling to a stub. Answers false for a hash this desk does
    // not own, which is what lets the router keep its own behaviour for it.
    arrive: arrive,
    _workMode: modeForWorkId,
    _hashId: hashId,
    _deskNode: deskNode,
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
    // ── THE ISSUE-KEY RESOLVER, SHARED ────────────────────────────────────
    // The Eye asks the same question this desk's typeahead asks — "does this
    // phrase name a tracked key?" — and it has to get the same answer, or a
    // reader follows a search hit to a desk that opens something else. One
    // resolver, one owner, exported rather than re-implemented.
    issueKeyFor: issueKeyFor,
    issueLabelFor: issueLabel,
    trackedKeys: trackedKeys,
    // ── THE ISSUE FILE'S ONE BUILDER ──────────────────────────────────────
    // Exported for the address at /i/<key>, and for nothing else. This is the
    // SAME function issueDeskHtml() calls when a chip is tapped, which is what
    // makes the two doors one paint rather than two surfaces that agree today.
    // PDXIssueProfile.html(key) is a one-line delegation to it.
    issueProfile: issueProfileHtml,
    // Measures whose curation maps them to a key, for a surface that wants to
    // say how much is on file without warming anybody's record.
    issueMeasures: function (key) {
      try { return ledgerMeasures([], key); } catch (e) { return []; }
    },
    _ledger: issueLedger,
    _seek: window.pdxDoor1IssueSeek,
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

  // modeForWorkId() is declared once, up beside VIEWS, because it is the arrival
  // table for the hash and the stubs as well as for this wrapper.

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
    // ── THE HASH, ON LOAD AND ON EVERY CHANGE ───────────────────────────────
    // Owned here rather than left to index.html's handler alone, so the mode and
    // the landing are decided by the same code that knows whether a desk exists
    // and which mode a WORK_ID means. index.html delegates to arrive() as well;
    // the two calls dedupe, so whichever runs first is the arrival and the other
    // is a no-op. A hash naming anything else returns false from arrive() and
    // nothing on this desk moves.
    try {
      window.addEventListener('hashchange', function () { arrive(hashId()); });
    } catch (e) {}
    arrive(hashId());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
