/* ============================================================================
   pdx-aipac.js — THE AIPAC CHIP ON THE PERSON-FILE LETTERHEAD
   ============================================================================
   WHAT IT ANSWERS. One question a reader could not answer from a person file:
   has this person taken AIPAC money, or voted with AIPAC's published positions?
   The 💰 pills answer "what did the campaign raise" and "is an in-office
   disclosure on file"; the stance pills answer issue positions. Neither names the
   AIPAC relationship, so this chip does, in one of three states:

       AIPAC-backed           AIPAC or AIPAC-affiliated PAC money in the filing
                              on file for the current cycle, OR a voting record
                              that matches AIPAC's published scorecard positions
                              at or above BACKED_SHARE.
       Mixed                  some AIPAC-affiliated money (not the current
                              cycle), or a scorecard record below BACKED_SHARE.
       No AIPAC file on hand  neither source holds anything for this person.

   TWO SOURCES, BOTH ALREADY ON THE SITE OR EMPTY ON PURPOSE.

     1. RECEIPTS. The money lane's own filing door, PDXFinance.filing(pid) —
        the OpenSecrets / FEC record finance-lane.js already reads — filtered to
        AIPAC and AIPAC-affiliated PAC names (AFFILIATED below) and nothing else.
        This file never touches the filings index directly: it knocks on the same
        public door pdx-finance.js does, so there is one answer to "does this
        person have a filing" and the money lane's seam sweep still sees two
        files.

     2. AIPAC SCORECARDS. SCORECARD is AIPAC's own published position per roll
        call for the current Congress, keyed by an archive rollcallId. A row only
        counts for a person when that roll call is ALREADY a formal act in their
        voting record (PDXVotingRecord.memberRecords) with a yea or nay. Nothing
        here creates a vote. The table ships EMPTY: transcribing AIPAC's
        scorecard against archive ids is its own hand-verified wave, and until it
        runs, the scorecard side answers "nothing on file" for everybody.

   WHAT IT NEVER PRINTS. No dollar figure, no percentage, no score, no count — in
   the visible text or in the accessible name. The chip names a relationship and
   its source. The arithmetic that decides "backed" against "mixed" stays inside
   read() and is never published as a number a surface could print.

   NEVER_FEEDS. Not an input to Direction Match / Word vs Action, the formal
   tiers, the publication floor, ballot order, Your Match or any ranking.

   ABSENT IS NOT CLEAN. The chip renders on every profile. "No AIPAC file on
   hand" says the archive holds nothing, not that there is no relationship.
   ========================================================================== */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : this;

  // AIPAC and the PACs it runs. Matched against the named contributor rows of
  // the filing on file; anything else is not this chip's business.
  var AFFILIATED = [
    /\bAIPAC\b/i,
    /American Israel Public Affairs/i,
    /United Democracy Project/i
  ];

  // The 119th Congress was elected in the 2024 cycle and faces the 2026 one.
  var CONGRESS = '119';
  var CURRENT_CYCLES = ['2024', '2026'];

  // "Backed" off the scorecard alone: four scored votes in five with AIPAC's
  // published position, over at least MIN_SCORED roll calls already in the
  // archive. Fewer than that is not a voting record, it is an anecdote, and the
  // scorecard side reads as nothing on file.
  var BACKED_SHARE = 0.8;
  var MIN_SCORED = 3;

  // AIPAC's published scorecard for the current Congress, one row per scored
  // roll call: { rollcallId, position: 'yea'|'nay', source }. rollcallId must be
  // an id the voting-record archive already carries. EMPTY ON PURPOSE — see the
  // header. scorecardDefects() is the gate a curator's rows must pass.
  var SCORECARD = [];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isAffiliated(name) {
    var n = String(name || '');
    for (var i = 0; i < AFFILIATED.length; i++) if (AFFILIATED[i].test(n)) return true;
    return false;
  }

  function scorecardDefects(rows) {
    var out = [];
    var seen = {};
    (rows || []).forEach(function (r, i) {
      var at = 'row ' + i;
      if (!r || typeof r !== 'object') { out.push(at + ': not an object'); return; }
      if (!r.rollcallId || typeof r.rollcallId !== 'string') out.push(at + ': no archive rollcallId');
      else if (seen[r.rollcallId]) out.push(at + ': duplicate rollcallId ' + r.rollcallId);
      else seen[r.rollcallId] = true;
      if (r.position !== 'yea' && r.position !== 'nay') out.push(at + ': position must be yea or nay');
      if (!/^https:\/\//.test(String(r.source || ''))) out.push(at + ': no https source');
    });
    return out;
  }

  // ── RECEIPTS ───────────────────────────────────────────────────────────────
  function filingFor(pid) {
    var F = W.PDXFinance;
    if (F && typeof F.filing === 'function') {
      try { var r = F.filing(pid); if (r) return r; } catch (e) {}
    }
    var get = W._pdxFinanceFiling;
    if (typeof get === 'function') {
      try { return get(pid) || null; } catch (e) {}
    }
    return null;
  }

  function sourceName(url) {
    return /opensecrets\.org/i.test(String(url || '')) ? 'OpenSecrets' : 'FEC';
  }

  function receiptsRead(pid) {
    var rec = filingFor(pid);
    if (!rec) return null;
    var hits = (rec.topDonors || []).filter(function (d) { return d && isAffiliated(d.name); });
    if (!hits.length) return null;
    var cycle = rec.funding && rec.funding.cycle ? String(rec.funding.cycle) : '';
    var url = rec.source || (rec.funding && rec.funding.source) || '';
    return {
      state: CURRENT_CYCLES.indexOf(cycle) >= 0 ? 'backed' : 'mixed',
      source: sourceName(url)
    };
  }

  // ── SCORECARD ──────────────────────────────────────────────────────────────
  function scorecardRead(pid) {
    if (!SCORECARD.length) return null;
    var VR = W.PDXVotingRecord;
    var items = VR && typeof VR.memberRecords === 'function' ? VR.memberRecords(pid) : null;
    if (!items || !items.length) return null;
    var want = {};
    SCORECARD.forEach(function (r) { want[r.rollcallId] = r.position; });
    var scored = 0, matched = 0;
    items.forEach(function (it) {
      var pos = it && want[it.rollcallId];
      if (!pos || (it.position !== 'yea' && it.position !== 'nay')) return;
      scored++;
      if (it.position === pos) matched++;
    });
    if (scored < MIN_SCORED) return null;
    return { state: matched / scored >= BACKED_SHARE ? 'backed' : 'mixed', source: 'AIPAC scorecard' };
  }

  // The whole read: a state and the sources behind it. No figure leaves here.
  function read(pid) {
    var reads = [];
    try { var m = receiptsRead(pid); if (m) reads.push(m); } catch (e) {}
    try { var s = scorecardRead(pid); if (s) reads.push(s); } catch (e) {}
    if (!reads.length) return { state: 'empty', sources: [] };
    var backed = reads.filter(function (r) { return r.state === 'backed'; });
    var use = backed.length ? backed : reads;
    return {
      state: backed.length ? 'backed' : 'mixed',
      sources: use.map(function (r) { return r.source; })
    };
  }

  // ── THE CHIP ───────────────────────────────────────────────────────────────
  var STATE_TEXT = { backed: 'AIPAC-backed', mixed: 'Mixed', empty: 'No AIPAC file on hand' };

  function label(r) {
    if (r.state === 'empty') {
      return 'AIPAC relationship: No AIPAC file on hand. No AIPAC or AIPAC-affiliated PAC ' +
        'receipts in the OpenSecrets or FEC data on file, and no AIPAC scorecard votes ' +
        'mapped to this archive. This is not a finding that there is no relationship.';
    }
    var src = r.sources.join(' and ');
    var why = r.state === 'backed'
      ? 'AIPAC or AIPAC-affiliated PAC money in the current cycle, or votes matching AIPAC’s published scorecard positions'
      : 'some AIPAC-affiliated money, or a voting record mixed against AIPAC’s published scorecard';
    return 'AIPAC relationship: ' + STATE_TEXT[r.state] + '. Source: ' + src + '. ' +
      'Based on ' + why + '. Not a score and not a dollar figure.';
  }

  function segments(r) {
    if (r.state === 'empty') return [STATE_TEXT.empty];
    if (r.state === 'backed') return [STATE_TEXT.backed].concat(r.sources);
    return ['AIPAC', STATE_TEXT.mixed].concat(r.sources);
  }

  // Receipts open the money section; a scorecard-only read opens the voting
  // record it was built from.
  function targetFor(r) {
    return r.sources.length === 1 && r.sources[0] === 'AIPAC scorecard' ? 'pdxsec-voting' : 'pdxsec-funding';
  }

  function open(id) {
    try {
      if (typeof W._pdxNavJump === 'function') { W._pdxNavJump(id); return false; }
      if (typeof W._pdxRevealTarget === 'function') W._pdxRevealTarget(id);
      var el = W.document && W.document.getElementById(id);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {}
    return false;
  }

  // Same token as the two 💰 pills (finance-lane.css): .pdx-mchip, the gold
  // glyph, the separators. Its own data attributes, so the row still carries
  // exactly two money LANES and nothing that counts those pills counts this one.
  function chipHtml(pid) {
    try {
      var r = read(pid);
      var segs = segments(r);
      var inner = '';
      for (var i = 0; i < segs.length; i++) {
        if (i) inner += '<span class="pdx-mchip-sep" aria-hidden="true">·</span>';
        inner += '<span class="pdx-mchip-hi">' + esc(segs[i]) + '</span>';
      }
      return '<button type="button" class="pdx-mchip" data-pdx-aipac="' + esc(pid || '') + '"' +
        ' data-pdx-aipac-state="' + r.state + '"' +
        ' onclick="event.stopPropagation();if(window.PDXAipac)window.PDXAipac.open(\'' + targetFor(r) + '\');"' +
        ' aria-label="' + esc(label(r)) + '">' +
          '<span class="pdx-mchip-ico" aria-hidden="true">💰</span>' + inner +
        '</button>';
    } catch (e) { return ''; }
  }

  // Host + repaint OUT OF THE EMPTY STATE ONLY: the scorecard side can only
  // answer once the voting record has landed, so a chip built before that is
  // allowed to change its mind once — never a chip already telling the truth.
  var _seq = 0;
  function repaint(pid) {
    var doc = W.document;
    if (!doc || !doc.querySelectorAll) return;
    try {
      var hosts = doc.querySelectorAll('[data-pdx-aipac-host]');
      for (var i = 0; i < hosts.length; i++) {
        var h = hosts[i];
        if (h.getAttribute('data-pdx-aipac-pid') !== pid) continue;
        var cur = h.firstChild && h.firstChild.getAttribute ? h.firstChild.getAttribute('data-pdx-aipac-state') : null;
        if (cur !== 'empty' || read(pid).state === 'empty') continue;
        h.innerHTML = chipHtml(pid);
      }
    } catch (e) {}
  }

  function chipMount(pid) {
    try {
      _seq++;
      var uid = ('aipac-' + String(pid || 'none') + '-' + _seq).replace(/[^A-Za-z0-9_-]/g, '');
      var inner = chipHtml(pid);
      if (W.setTimeout) W.setTimeout(function () { repaint(String(pid || '')); }, 0);
      return '<span class="pdx-mchip-host" data-pdx-aipac-host="' + esc(uid) + '"' +
        ' data-pdx-aipac-pid="' + esc(pid || '') + '">' + inner + '</span>';
    } catch (e) { return ''; }
  }

  if (typeof W.addEventListener === 'function') {
    W.addEventListener('pdx-record-noted', function (e) {
      var d = (e && e.detail) || {};
      if (d.pid) repaint(String(d.pid));
      if (d.canon && d.canon !== d.pid) repaint(String(d.canon));
    });
  }

  W.PDXAipac = {
    read: read,
    chipHtml: chipHtml,
    chipMount: chipMount,
    open: open,
    isAffiliated: isAffiliated,
    scorecardDefects: scorecardDefects,
    SCORECARD: SCORECARD,
    CONGRESS: CONGRESS,
    scored: false,
    NEVER_FEEDS: ['directionMatch', 'wordVsAction', 'formalPatternTier',
                  'publicationFloor', 'formalActCounts', 'ballotSort',
                  'yourMatch', 'anyCrossPersonRanking', 'alignment', 'door2Picks']
  };
})();
