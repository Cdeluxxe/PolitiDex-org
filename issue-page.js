/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Issue page  ·  window.PDXIssuePage  ·  /issue/<key>
   ────────────────────────────────────────────────────────────────────────────
   ONE PAGE PER VOCABULARY KEY, AND IT ANSWERS ONE QUESTION: which acts in the
   archive actually moved this issue?

   Tapping 🏠 Housing Affordability used to land on a ranked overlay of PEOPLE
   (issue-view.js) or, from a person's brief, on whichever core issue that
   overlay widened a raw key into — so a reader who asked about an ISSUE was
   handed one member's dossier. This module is the missing destination: the
   measures, first, in full, with the members second.

   WHAT IS ON IT
     • The chip and the locked scope sentence, read from issue-scope.js — the
       same ⓘ prose every issue chip on the site already opens. Nothing here
       writes issue copy.
     • Counts, and only counts: measures on file, how many carry a floor roll,
       how many member rows can be read. No percentage, no score, no ranking.
     • THE LIST — every measure mapped to this key. Number, short title, whether
       this issue is the bill's subject or rode inside it, chamber · last roll
       date · Yea–Nay when a roll exists. Subject-of-the-bill rows first, then
       newest roll. Each row opens that bill's profile.
     • WHO THE RECORD READS — members with a published direction on this key,
       folded below the list: supports / opposes / split / thin, with the same
       short pattern line the stance tree prints, and a tap into that person's
       dossier on this issue.

   THE WALLS (each one is enforced below, at the line that could break it)
     1. FORMAL MAPPINGS ONLY. The list is the measure→issue bridge and nothing
        else — no news, no inferred stance, no keyword match. The member block
        is PUBLISHED positions only; the tree's pattern-only rows (the ones it
        tags "Not in Direction Match") are inferred, and they are not here.
     2. DO NOT INVENT A MEASURE. A live answer of zero is the empty state, not a
        cue to backfill from the inline paint index. The index is merged in only
        when the live read FAILED, because then the alternative is a blank page
        that claims nothing is mapped.
     3. DO NOT DISCOUNT PACKAGE VOTES. A rider row and a subject row are the
        same size, in the same list, with the same door. `isOmnibus` is not read
        here at all.
     4. NO DIRECTION MATCH. The leaf's `record.pct` is the one percentage on a
        stance leaf and it is never projected onto this page. Nothing here sorts
        or groups people by anything but the direction they published.
     5. NOT A PARTY SORT. Party is not read, printed, or ordered on.

   Reads (all as guests, each behind a guard): PDXBills (the /measures browse
   route), PDXIssueScope (the scope prose + the ⓘ), ISSUE_MAP / _issueLabel,
   PDXStanceTree (the pattern line), _resolveStanceList / ISSUE_STANCE_DATA,
   CMP_DATA / PROFILES, PDXIssueColors, PDXBillDetail / PDXBills.open.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXIssuePage) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(s) { return esc(s); }
  function G(n) { try { return window[n]; } catch (e) { return null; } }

  // The copy this page owns. Everything else it prints is read from the module
  // that owns it, so a sentence can only be changed in one place.
  var EMPTY = 'No mapped measure on file yet';
  var SUBJECT = 'this bill’s subject';
  var RODE = 'rode inside';
  var PKG_NOTE = 'Every mapping is listed. A package that carried this issue ' +
    'inside it counts in full — no rider is hidden and no package vote is discounted.';
  var PEOPLE_TITLE = 'Who the record reads';
  var PEOPLE_WALL = 'A published position on this issue, and the formal record behind it. ' +
    'This is not a ranking and it is not a match score.';
  var NO_PEOPLE = 'No member has a published position on this issue yet.';
  // The tree's own sentence for a formal-record lane still in flight, matched
  // character for character rather than paraphrased: the same member's tree may be
  // open in the next tab, and a second wording for one state would read as a
  // second state. Kept here so this file can tell "still loading" apart from a
  // finding without importing consistency.js's private table.
  var LANE_WARM = 'Checking the formal record\u2026';
  var BUCKETS = [
    { key: 'supports', label: 'Supports', readable: true },
    { key: 'opposes', label: 'Opposes', readable: true },
    { key: 'split', label: 'Split', readable: true },
    // A published position whose direction cannot be read against this key's own
    // chip. It is on the page — it is on file — but it is not a readable row, and
    // the count above says so rather than quietly rounding it up.
    { key: 'thin', label: 'Thin', readable: false }
  ];

  // ── THE VOCABULARY GATE ─────────────────────────────────────────────────────
  // One page per vocabulary key means exactly that: a slug that is not a key gets
  // no page, and the caller (the /issue/* router) is told so by a false return.
  // ISSUE_MAP is the client's key table and the same one the ⓘ reads; issue-scope
  // is the fallback for a boot where alignment-tool.js has not run.
  function has(key) {
    var k = String(key == null ? '' : key);
    if (!k || !/^[A-Za-z0-9_-]+$/.test(k)) return false;
    try { var M = G('ISSUE_MAP'); if (M && M[k]) return true; } catch (e) {}
    try {
      var S = G('PDXIssueScope');
      if (S && typeof S.read === 'function') { var r = S.read(k); if (r && r.defined) return true; }
    } catch (e2) {}
    return false;
  }

  function issueLabel(k) {
    try { if (typeof window._issueLabel === 'function') { var l = window._issueLabel(k); if (l) return l; } } catch (e) {}
    try {
      var S = G('PDXIssueScope');
      var r = (S && typeof S.read === 'function') ? S.read(k) : null;
      if (r && r.label) return r.label;
    } catch (e2) {}
    return String(k || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // The chamber display forms, matching bill-detail.js exactly: the stored value
  // is the jurisdiction, so every surface that prints it owes the reader the
  // display form rather than 'utah house' mid-sentence.
  var CHAMBERS = {
    house: 'House', senate: 'Senate', joint: 'Joint', court: 'Court',
    executive: 'Executive', 'utah house': 'Utah House', 'utah senate': 'Utah Senate'
  };
  function chamberLabel(c) {
    if (!c) return '';
    var k = String(c).toLowerCase().trim();
    return CHAMBERS[k] || String(c).replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }
  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return String(iso).slice(0, 10); }
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || (one + 's'))); }
  // The lane labels and the roll line are written for a row, where they are
  // fragments beside a title. An announced row is a SENTENCE, so it gets a capital
  // — "this bill's subject" read aloud mid-sentence is the row's one label sounding
  // like a clause that lost its verb.
  function cap(s) {
    s = String(s == null ? '' : s);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  // ── THE SCOPE HEAD ──────────────────────────────────────────────────────────
  // The chip and the locked scope sentence are issue-scope.js's copy, read and
  // never rewritten. A key with no argued-out scope entry gets that module's own
  // honest blank, for the same reason the ⓘ card does: a scope this site never
  // decided is not one this page may invent.
  function scopeOf(key) {
    var S = G('PDXIssueScope');
    var r = null;
    try { if (S && typeof S.read === 'function') r = S.read(key); } catch (e) { r = null; }
    if (r) return r;
    return { key: key, label: issueLabel(key), chip: '', inn: '', defined: false };
  }
  function scopeControlHtml(key) {
    try {
      var S = G('PDXIssueScope');
      if (!S || typeof S.controlHtml !== 'function') return '';
      return S.controlHtml(key) || '';
    } catch (e) { return ''; }
  }
  function noDef() {
    try {
      var S = G('PDXIssueScope');
      if (S && S.NO_DEF) return String(S.NO_DEF);
    } catch (e) {}
    return 'The scope of this issue key has not been written down yet.';
  }
  // The tint is keyed on the ISSUE and nothing else — same rule as the letterhead
  // chip, so one topic is one colour everywhere on the site.
  function issueTint(key) {
    try {
      var C = G('PDXIssueColors');
      if (!C || typeof C.styleFor !== 'function') return '';
      var st = C.styleFor(key);
      return st ? ' data-ic="on" style="' + escAttr(st) + '"' : '';
    } catch (e) { return ''; }
  }

  // ── COUNTS ONLY ─────────────────────────────────────────────────────────────
  // Three counts of rows on this page, and no fourth number. There is deliberately
  // no percentage here: a share needs a denominator this page does not have (the
  // archive is not the legislature), and any ratio printed over these three would
  // read as a grade for the issue.
  function counts(rows, people) {
    rows = rows || []; people = people || [];
    var withRoll = 0;
    rows.forEach(function (r) { if (r.roll || r.rolls > 0) withRoll++; });
    var readable = 0;
    people.forEach(function (p) { if (p.readable) readable++; });
    return { measures: rows.length, rolls: withRoll, people: readable };
  }
  function countsLine(c) {
    return plural(c.measures, 'measure') + ' on file' +
      ' · ' + c.rolls + ' with a floor roll' +
      ' · ' + plural(c.people, 'readable member-row', 'readable member-rows');
  }

  // ── ONE MEASURE, ONE ROW ────────────────────────────────────────────────────
  // `primaryIssueKeys` is the browse route's per-key primary flags: an act can be
  // the subject of two axes at once (H.R. 6644 is a housing act AND a supply act),
  // so the lane label has to be read against THIS key rather than off the single
  // `primaryIssue` slot, which names only whichever mapping sorted first.
  //   The inline paint index carries no per-key flags, so there the single slot is
  // all there is — and it is correct, because that index records one primary.
  function rowOf(it, key) {
    if (!it || !key) return null;
    var pk = Array.isArray(it.primaryIssueKeys) ? it.primaryIssueKeys : null;
    var subject = pk ? pk.indexOf(key) > -1 : (String(it.primaryIssue || '') === String(key));
    var lr = it.lastRoll && (it.lastRoll.voteDate || it.lastRoll.chamber) ? it.lastRoll : null;
    return {
      id: (it.id != null) ? it.id : null,
      number: it.number || '',
      title: it.shortTitle || it.title || it.number || '',
      chamber: it.chamber || '',
      sitting: sittingOf(it),
      subject: !!subject,
      rolls: (typeof it.rollcallCount === 'number') ? it.rollcallCount : 0,
      roll: lr ? {
        chamber: lr.chamber || '',
        date: lr.voteDate || '',
        yea: (lr.yea == null ? null : lr.yea),
        nay: (lr.nay == null ? null : lr.nay),
        result: lr.result || ''
      } : null
    };
  }
  // The sitting a card knows about — a congress federally, the recorded session
  // code for a state row whose congress column is NULL. Same read as bills.js, so
  // a row here and a library card open the same bill profile.
  function sittingOf(it) {
    if (!it) return '';
    var x = it.externalIds;
    var us = (x && typeof x === 'object' && x.utahSession) ? String(x.utahSession).trim() : '';
    if (us) return us;
    return (it.congress != null && it.congress !== '') ? String(it.congress) : '';
  }
  function rowsFrom(items, key) {
    var out = [];
    (items || []).forEach(function (it) {
      var r = rowOf(it, key);
      if (r && r.number) out.push(r);
    });
    return dedupe(out);
  }
  // One measure, one row: the live pages and the inline index can name the same
  // act, and a reader who sees H.R. 6644 twice has been told the archive holds two
  // of them.
  function dedupe(rows) {
    var seen = {}, out = [];
    rows.forEach(function (r) {
      var k = String(r.sitting || '') + '|' + String(r.number || '');
      if (seen[k]) return;
      seen[k] = 1;
      out.push(r);
    });
    return out;
  }

  // SUBJECT FIRST, THEN NEWEST ROLL. The lane is the sort's first key because it
  // is the only thing on the row that says how much of the act this issue WAS;
  // the roll date is second because among acts of the same standing, the reader
  // wants the last thing that happened. A row with no roll sorts last inside its
  // own lane and is NOT dropped — an unvoted mapped act is a fact about the
  // archive, and hiding it would make the list agree with the roll count.
  function sortRows(rows) {
    return (rows || []).slice().sort(function (a, b) {
      if (a.subject !== b.subject) return a.subject ? -1 : 1;
      var da = (a.roll && a.roll.date) ? String(a.roll.date) : '';
      var db = (b.roll && b.roll.date) ? String(b.roll.date) : '';
      if (da !== db) return da < db ? 1 : -1;
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
    });
  }

  // chamber · last roll date · Yea–Nay. Every piece is optional and each absence
  // is printed as words: a measure with no floor roll says so, rather than
  // rendering an empty slot a reader would read as a zero.
  function rollLine(r) {
    if (r.roll) {
      var bits = [];
      var ch = chamberLabel(r.roll.chamber || r.chamber);
      if (ch) bits.push(ch);
      var d = fmtDate(r.roll.date);
      if (d) bits.push(d);
      if (r.roll.yea != null && r.roll.nay != null) bits.push(r.roll.yea + '–' + r.roll.nay);
      return bits.join(' · ');
    }
    var c = chamberLabel(r.chamber);
    if (r.rolls > 0) {
      return (c ? c + ' · ' : '') + plural(r.rolls, 'floor roll') + ' on file';
    }
    return (c ? c + ' · ' : '') + 'no floor roll on file yet';
  }

  function rowHtml(r) {
    return '<li class="pdxip-row" data-pdxip-lane="' + (r.subject ? 'subject' : 'rode') + '">' +
      '<button type="button" class="pdxip-open"' +
        ' data-pdxip-bill="' + escAttr(r.number) + '"' +
        ' data-pdxip-sitting="' + escAttr(r.sitting) + '"' +
        (r.id != null ? ' data-pdxip-id="' + escAttr(r.id) + '"' : '') +
        ' aria-label="' + escAttr(r.number + ' — ' + r.title + '. ' +
          cap(r.subject ? SUBJECT : RODE) + '. ' + cap(rollLine(r)) + '. Open this bill.') + '">' +
        '<span class="pdxip-num">' + esc(r.number) + '</span>' +
        '<span class="pdxip-ttl">' + esc(r.title) + '</span>' +
        // The lane and the roll line share one strip under the loud line, in that
        // order, so a row is two lines rather than four stacked fragments. Both
        // used to sit in their own grid cell at fine-print size, which is what made
        // the whole list read as one block.
        '<span class="pdxip-sub">' +
          '<span class="pdxip-lane-t">' + esc(r.subject ? SUBJECT : RODE) + '</span>' +
          '<span class="pdxip-meta">' + esc(rollLine(r)) + '</span>' +
        '</span>' +
        '<span class="pdxip-go" aria-hidden="true">›</span>' +
      '</button>' +
    '</li>';
  }

  function listHtml(rows, key) {
    if (!rows.length) {
      // THE HONEST BLANK. The scope sentence stays — the reader still deserves to
      // know what this key means — and nothing is backfilled to fill the space.
      var s = scopeOf(key);
      return '<section class="pdxip-sect pdxip-empty" data-pdxip-empty="1">' +
        '<p class="pdxip-empty-h">' + esc(EMPTY) + '</p>' +
        '<p class="pdxip-empty-b">' + esc(s.defined ? s.inn : noDef()) + '</p>' +
      '</section>';
    }
    // The tint rides on the SECTION, not just the header chip: `--pdx-ic` is a
    // custom property and inherits, so every row inside can key its left edge off
    // the one colour this issue already has everywhere else on the site. Nothing
    // here reads the attribute — it is set by the same accessor the chip uses, so
    // there is one way to ask for an issue's colour and not two.
    return '<section class="pdxip-sect" data-pdxip-list="1"' + issueTint(key) + '>' +
      '<h3 class="pdxip-h">Every measure mapped to this issue</h3>' +
      '<ol class="pdxip-rows">' + rows.map(rowHtml).join('') + '</ol>' +
      '<p class="pdxip-note">' + esc(PKG_NOTE) + '</p>' +
    '</section>';
  }

  // ── WHO THE RECORD READS ────────────────────────────────────────────────────
  // PUBLISHED POSITIONS ONLY, on this exact key. `_resolveStanceList` is the one
  // accessor for a person's curated cards (id, alias, name-slug), so this block
  // and every stance surface read the same list.
  //   The tree's PATTERN-ONLY rows are deliberately absent: a row with no stated
  // position is the tree reading a record and inferring a direction, the tree
  // tags it "Not in Direction Match" for exactly that reason, and wall 1 on this
  // page says formal mappings only. What a member SAID is published; what their
  // votes imply is not a position.
  function rosterIds() {
    var out = [], seen = {};
    ['CMP_DATA', 'PROFILES'].forEach(function (n) {
      var d = G(n);
      if (!d) return;
      try {
        Object.keys(d).forEach(function (id) {
          var c = id;
          try { if (typeof window.PDXCanonicalPid === 'function') c = window.PDXCanonicalPid(id) || id; } catch (e) {}
          if (seen[c]) return;
          seen[c] = 1;
          out.push(c);
        });
      } catch (e) {}
    });
    return out;
  }
  function polRec(id) {
    var C = G('CMP_DATA'); if (C && C[id]) return C[id];
    var P = G('PROFILES'); if (P && P[id]) return P[id];
    return null;
  }
  function polName(id) {
    try {
      if (typeof window._pdxPoliticianName === 'function') {
        var n = window._pdxPoliticianName(id);
        if (n && n !== id) return n;
      }
    } catch (e) {}
    var d = polRec(id);
    if (d && d.name) return d.name;
    return String(id || '').split(/[_\-]/).filter(Boolean)
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function stanceList(id, p) {
    try {
      if (typeof window._resolveStanceList === 'function') return window._resolveStanceList(id, p) || [];
    } catch (e) {}
    try {
      var SD = G('ISSUE_STANCE_DATA');
      return (SD && SD[id]) ? SD[id] : [];
    } catch (e2) { return []; }
  }
  // The published direction on this key, read off the card the same way every
  // other surface reads it: `issueStance` is written relative to THIS key's chip,
  // and `pos` is the fallback for a card that predates the field. Anything that is
  // not one of the three published words is thin — on file, not readable.
  function dirOf(card) {
    var raw = String((card && (card.issueStance || card.pos)) || '').toLowerCase().trim();
    if (raw === 'support') return 'supports';
    if (raw === 'oppose') return 'opposes';
    if (raw === 'mixed') return 'split';
    return 'thin';
  }
  // The same short pattern line the tree prints, from the tree itself. `record.pct`
  // is NOT read: it is the Direction Match figure, and wall 4 keeps it off this
  // page. A leaf that cannot be built leaves the row with a name and a direction,
  // which is all this page ever promised.
  //   IT IS NOT GATED ON `onRecord`. The tree prints its record slot whenever the
  // slot exists, including the state that says "No formal record on this issue
  // yet" — which is a fact about the archive, not a blank — and a member row here
  // that silently dropped that line would be the one place on the site where the
  // absence of a record looks the same as a record nobody has looked at.
  function patternOf(pid, key) {
    var T = G('PDXStanceTree');
    if (!T || typeof T.leaf !== 'function') return null;
    var lf = null;
    try { lf = T.leaf(pid, key); } catch (e) { lf = null; }
    var rc = lf && lf.record;
    if (!rc || !rc.label) return null;
    // LOADING IS A STATE, NOT A FINDING. The formal-record lane arrives after first
    // paint, so on a cold open the tree's record slot is legitimately 'pending' and
    // its label is the sentence that says so. That sentence used to be printed in
    // the same weight as a real record read and then left there for good, because
    // this page rendered twice and never again. It is carried as a flag now: the
    // row marks itself busy, and the warm repaint below clears it. `state` is the
    // structural test; the label comparison is the backstop for a leaf assembled
    // by anything that fills the label without filling the state.
    var pending = (rc.state === 'pending') || (String(rc.label) === LANE_WARM);
    return {
      label: String(rc.label),
      // The tree prints `depth` beside this label ('6 votes on file') and this page
      // printed `counts` instead, which is the tally behind it. Both, in the tree's
      // order, so the line reads the same in both places.
      depth: String(rc.depth || ''),
      counts: String(rc.counts || ''),
      pending: pending
    };
  }
  function peopleRows(key) {
    if (!key) return [];
    var out = [];
    rosterIds().forEach(function (pid) {
      var p = polRec(pid);
      var cards = stanceList(pid, p) || [];
      var card = null;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i] && String(cards[i].issueKey || '') === String(key)) { card = cards[i]; break; }
      }
      if (!card) return;
      var bucket = dirOf(card);
      var b = null;
      for (var j = 0; j < BUCKETS.length; j++) { if (BUCKETS[j].key === bucket) b = BUCKETS[j]; }
      out.push({
        pid: pid, name: polName(pid), bucket: bucket,
        bucketLabel: b ? b.label : 'Thin',
        readable: !!(b && b.readable),
        pattern: patternOf(pid, key)
      });
    });
    // GROUPED BY WHAT THEY PUBLISHED, ORDERED BY NAME INSIDE THE GROUP. The group
    // order is the vocabulary's own order, not a standing: "supports" is not above
    // "opposes", it is only printed before it, and inside a group the order is
    // alphabetical precisely so nothing on this page can be read as a rank.
    var rank = {};
    BUCKETS.forEach(function (x, i) { rank[x.key] = i; });
    return out.sort(function (a, b2) {
      var ra = rank[a.bucket] == null ? 9 : rank[a.bucket];
      var rb = rank[b2.bucket] == null ? 9 : rank[b2.bucket];
      if (ra !== rb) return ra - rb;
      return a.name < b2.name ? -1 : a.name > b2.name ? 1 : 0;
    });
  }

  function personHtml(p, key) {
    var pat = '';
    if (p.pattern) {
      var tail = [p.pattern.depth, p.pattern.counts].filter(Boolean).join(' · ');
      pat = '<span class="pdxip-p-pat' + (p.pattern.pending ? ' is-warm' : '') + '"' +
          (p.pattern.pending ? ' aria-busy="true"' : '') + '>' +
        '<b>🏛 Record:</b> ' + esc(p.pattern.label) +
        (tail ? '<i class="pdxip-p-cnt"> · ' + esc(tail) + '</i>' : '') +
      '</span>';
    }
    // The dossier door is the site's existing contract — [data-pdxst-dos] on the
    // element, resolved by the same delegated handler the tree's leaves use — so
    // this row lands on the person file for THIS issue and not on a second sheet
    // built here.
    return '<li class="pdxip-p" data-pdxip-bucket="' + escAttr(p.bucket) + '">' +
      '<button type="button" class="pdxip-p-open"' +
        ' data-pdxip-pid="' + escAttr(p.pid) + '"' +
        ' data-pdxst-dos="' + escAttr(key) + '" data-pdxst-pid="' + escAttr(p.pid) + '"' +
        ' data-pdxst-focus="record"' +
        ' aria-label="' + escAttr(p.name + ' — ' + p.bucketLabel + ' on ' + issueLabel(key) +
          '. Open their file on this issue.') + '">' +
        '<span class="pdxip-p-name">' + esc(p.name) + '</span>' +
        '<span class="pdxip-p-said s-' + escAttr(p.bucket) + '">' + esc(p.bucketLabel) + '</span>' +
        pat +
        '<span class="pdxip-go" aria-hidden="true">›</span>' +
      '</button>' +
    '</li>';
  }

  function peopleHtml(people, key) {
    people = people || [];
    var body;
    if (!people.length) {
      body = '<p class="pdxip-note">' + esc(NO_PEOPLE) + '</p>';
    } else {
      body = BUCKETS.map(function (b) {
        var rows = people.filter(function (p) { return p.bucket === b.key; });
        if (!rows.length) return '';
        return '<div class="pdxip-grp" data-pdxip-grp="' + escAttr(b.key) + '">' +
          '<div class="pdxip-grp-h">' + esc(b.label) + ' · ' + rows.length + '</div>' +
          '<ul class="pdxip-ps">' + rows.map(function (p) { return personHtml(p, key); }).join('') + '</ul>' +
        '</div>';
      }).join('') + '<p class="pdxip-note">' + esc(PEOPLE_WALL) + '</p>';
    }
    var gist = people.length
      ? BUCKETS.map(function (b) {
          var n = people.filter(function (p) { return p.bucket === b.key; }).length;
          return n ? (n + ' ' + b.label.toLowerCase()) : '';
        }).filter(Boolean).join(' · ')
      : 'Nothing published yet';
    // FOLDED, AND BELOW THE LIST. The measures are the point of the page; the
    // members are the second question, so they open on a tap rather than pushing
    // the list off the first screen.
    return '<details class="pdxip-fold" data-pdxip-people="1">' +
      '<summary class="pdxip-fold-s">' +
        '<span class="pdxip-fold-t">' + esc(PEOPLE_TITLE) + '</span>' +
        '<span class="pdxip-fold-g">' + esc(gist) + '</span>' +
      '</summary>' +
      '<div class="pdxip-fold-b">' + body + '</div>' +
    '</details>';
  }

  // ── THE PAGE ────────────────────────────────────────────────────────────────
  function headHtml(key, c) {
    var s = scopeOf(key);
    return '<header class="pdxip-hd">' +
      '<div class="pdxip-chipw">' +
        '<span class="pdxip-chip"' + issueTint(key) + '>' + esc(s.label || issueLabel(key)) + '</span>' +
        scopeControlHtml(key) +
      '</div>' +
      (s.chip ? '<p class="pdxip-chipline">' + esc(s.chip) + '</p>' : '') +
      '<p class="pdxip-scope">' + esc(s.defined ? s.inn : noDef()) + '</p>' +
      (c ? '<p class="pdxip-counts">' + esc(countsLine(c)) + '</p>' : '') +
    '</header>';
  }

  function bodyHtml(state) {
    state = state || {};
    var key = state.key || '';
    if (state.loading) {
      return headHtml(key, null) +
        '<p class="pdxip-load" role="status">Reading every measure mapped to this issue…</p>';
    }
    var rows = state.rows || [];
    var people = state.people || [];
    var c = counts(rows, people);
    return headHtml(key, c) +
      (state.error
        ? '<p class="pdxip-note" role="status">The archive could not be reached just now, so this list may be short. ' +
          'Nothing below is invented — every row is a mapping on file.</p>'
        : '') +
      listHtml(rows, key) +
      peopleHtml(people, key);
  }

  // ── THE DATA READ ───────────────────────────────────────────────────────────
  // The browse route already filters by issue key through the measure→issue
  // bridge, which is what makes wall 1 a query rather than a client-side belief.
  // Pages are followed to the end (a key with more than one page is rare and the
  // cap only exists so a bad `hasMore` cannot spin), because "every measure" is
  // the whole point of the surface.
  var PAGE_CAP = 6;
  function inlineItems(key) {
    var idx = G('PDX_BILLS_INDEX');
    if (!Array.isArray(idx)) return [];
    return idx.filter(function (it) {
      if (!it) return false;
      var keys = (it.issueKeys || []).concat(it.primaryIssue ? [it.primaryIssue] : []);
      return keys.indexOf(key) > -1;
    });
  }
  function fetchItems(key) {
    var bills = G('PDXBills');
    if (!bills || typeof bills.list !== 'function') {
      return Promise.resolve({ items: inlineItems(key), error: true });
    }
    var acc = [];
    function page(n) {
      return bills.list({ issue: key, pageSize: 100, page: n }).then(function (d) {
        if (!d || !Array.isArray(d.items)) return { items: acc, error: true };
        // bills.js answers a failed request with the inline paint index, flagged.
        // That is the FAILED read, not an empty archive: filter it to this key and
        // say so on the page.
        if (d._inline) return { items: inlineItems(key), error: true };
        acc = acc.concat(d.items);
        if (d.hasMore && n < PAGE_CAP) return page(n + 1);
        return { items: acc, error: false };
      });
    }
    return page(1).catch(function () { return { items: inlineItems(key), error: true }; });
  }
  // The whole page's data, as one promise, so a test can drive the real read.
  function load(key) {
    return fetchItems(key).then(function (res) {
      var people = [];
      try { people = peopleRows(key); } catch (e) { people = []; }
      return {
        key: key,
        rows: sortRows(rowsFrom(res.items, key)),
        people: people,
        error: !!res.error
      };
    });
  }

  // ── THE OVERLAY ─────────────────────────────────────────────────────────────
  var _key = '';
  var _opener = null;  // the chip/button the reader opened the page from
  var _prevUrl = '';   // the address the reader opened the page FROM
  var _state = null;   // the last loaded page, kept so a lane can repaint it
  function ensureOverlay() {
    var ov = document.getElementById('pdx-ip-overlay');
    if (ov) return ov;
    if (!document.body || !document.createElement) return null;
    injectCss();
    ov = document.createElement('div');
    ov.id = 'pdx-ip-overlay';
    ov.className = 'pdxip-overlay';
    ov.hidden = true;
    ov.innerHTML =
      '<div class="pdxip-backdrop" data-pdxip-close></div>' +
      '<div class="pdxip-panel" role="dialog" aria-modal="true" aria-label="Issue page">' +
        '<button type="button" class="pdxip-x" data-pdxip-close aria-label="Close">×</button>' +
        '<div class="pdxip-scroll" id="pdx-ip-scroll"></div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      // closest(), not hasAttribute() - the X carries a glyph and the backdrop can
      // be given children later, and a dismissal control that only answers to a tap
      // on its own outermost box is a control that stops working the first time
      // anything is nested inside it.
      if (e.target.closest('[data-pdxip-close]')) { close(); return; }
      var b = e.target.closest('[data-pdxip-bill]');
      if (b) { openBill(b.getAttribute('data-pdxip-bill'), b.getAttribute('data-pdxip-sitting')); return; }
      var p = e.target.closest('[data-pdxip-pid]');
      if (p) {
        // The dossier door belongs to the site's delegated [data-pdxst-dos]
        // handler, which is on `document` and will see this tap on its way up.
        // This branch is only the fallback for a boot where that handler is not
        // on the page at all — the tap still has to land somewhere.
        if (!G('PDXConsistency')) {
          var pid = p.getAttribute('data-pdxip-pid');
          if (pid && typeof window.showProfile === 'function') { close(); window.showProfile(pid); }
        }
        return;
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !isOpen()) return;
      e.preventDefault();
      close();
    });
    // ── THE WARM REPAINT ──────────────────────────────────────────────────────
    // The member block's record lines come from the tree, whose formal-record lane
    // lands after first paint. This page rendered exactly twice - loading, then
    // loaded - so whatever the lane said while it was still in flight stayed on
    // screen for the life of the overlay: that is how 'Checking the formal record'
    // became a permanent caption rather than a wait. It rebuilds on the same
    // 'pdx-consistency-warm' event the tree, the spine and the header tally already
    // rebuild on, and only the member block is rebuilt - the measure list is not
    // refetched, and the reader's fold stays as they left it.
    if (window.addEventListener) {
      window.addEventListener('pdx-consistency-warm', function () {
        if (!isOpen() || !_state || !_state.key || _state.key !== _key) return;
        // Nothing to repaint once every row has an answer. The event fires once per
        // member in the queue, so without this the block would rebuild for members
        // it has already finished reading.
        var waiting = (_state.people || []).filter(function (p) {
          return p.pattern && p.pattern.pending;
        }).length;
        if (!waiting) return;
        var fold = document.querySelector('#pdx-ip-scroll [data-pdxip-people="1"]');
        if (!fold) return;
        var wasOpen = !!fold.open;
        // The row the reader is standing on, if they are standing on one. The swap
        // below destroys the element under the caret, and focus dropping to the
        // body mid-read is the same discourtesy as a fold closing itself.
        var heldPid = '';
        try {
          var ae = document.activeElement;
          var row = (ae && ae.closest) ? ae.closest('[data-pdxip-pid]') : null;
          if (row && fold.contains && fold.contains(row)) heldPid = row.getAttribute('data-pdxip-pid') || '';
        } catch (e) {}
        var people;
        try { people = peopleRows(_state.key); } catch (e) { return; }
        _state.people = people;
        try { fold.outerHTML = peopleHtml(people, _state.key); } catch (e) { return; }
        // The fold survives the swap. A repaint that closed a block the reader had
        // opened would look like the block had collapsed on its own.
        var next = document.querySelector('#pdx-ip-scroll [data-pdxip-people="1"]');
        if (!next) return;
        if (wasOpen) next.open = true;
        if (heldPid) {
          try {
            var back = next.querySelector('[data-pdxip-pid="' + heldPid + '"]');
            if (back && typeof back.focus === 'function') back.focus();
          } catch (e2) {}
        }
      });
    }
    return ov;
  }
  function show(html) {
    var ov = ensureOverlay();
    if (!ov) return false;
    var sc = document.getElementById('pdx-ip-scroll');
    if (sc) sc.innerHTML = html;
    // Remembered on the way IN, while the chip that was tapped is still the active
    // element, and only when the page was not already open - a repaint of an open
    // page must not overwrite the reader's real origin with something inside the
    // overlay itself.
    if (ov.hidden) {
      try {
        var ae = document.activeElement;
        _opener = (ae && ae !== document.body && !ov.contains(ae)) ? ae : null;
      } catch (e) { _opener = null; }
    }
    ov.hidden = false;
    try { document.documentElement.classList.add('pdxip-lock'); } catch (e) {}
    return true;
  }

  // ── THE ADDRESS ─────────────────────────────────────────────────────────────
  // /issue/<key> is the canonical, server-visible form and netlify.toml already
  // rewrites it to the app, so the path is pushed rather than a hash. Arriving on
  // it is the router's job (index.html), which is also what keeps a spotlight
  // slug on the same prefix pointing at the spotlight.
  function pushPath(key) {
    try {
      if (!history.pushState) return;
      var want = '/issue/' + encodeURIComponent(key);
      if (location.pathname === want) return;
      // The address to hand back on close. Never another /issue/ path: the page can
      // be reopened on a second key while the first is still up, and restoring to
      // the first would leave the bar claiming an issue page that is not there.
      if (!/^\/issue\//.test(location.pathname || '')) {
        _prevUrl = (location.pathname || '/') + (location.search || '') + (location.hash || '');
      }
      history.pushState({ pdxIssuePage: key }, document.title, want);
    } catch (e) {}
  }
  function clearPath() {
    try {
      if (!history.replaceState) return;
      if (!/^\/issue\//.test(location.pathname || '')) return;
      // RESTORED, NOT JUST CLEARED. The page is opened from a topic chip on a bill
      // letterhead and from a chip in a person brief, so the address underneath is
      // often /b/... or /p/... and not the front page. Closing used to rewrite it to
      // '/' regardless, so the reader was left reading a profile at an address that
      // said homepage. A reader who arrived on /issue/<key> cold has no earlier
      // address here, and for them '/' - what is actually rendered behind the
      // overlay - is still the honest answer.
      history.replaceState({}, document.title, _prevUrl || '/');
      _prevUrl = '';
    } catch (e) {}
  }

  function open(key, opts) {
    key = String(key == null ? '' : key);
    opts = opts || {};
    if (!has(key)) return false;
    _key = key;
    if (!show(bodyHtml({ key: key, loading: true }))) return false;
    if (!opts.fromPop) pushPath(key);
    load(key).then(function (st) {
      if (_key !== key) return; // the reader moved on while the archive answered
      _state = st;
      show(bodyHtml(st));
    }).catch(function () {
      if (_key !== key) return;
      _state = { key: key, rows: [], people: [], error: true };
      show(bodyHtml(_state));
    });
    return true;
  }
  // THE ONE CLOSE. The X, the backdrop, Escape and the router's own back-button
  // path (index.html -> syncIssuePage -> IP.close({fromPop:true})) all arrive here;
  // the only thing fromPop changes is whether the address is ours to rewrite,
  // because on a popstate the browser has already moved it.
  function close(opts) {
    opts = opts || {};
    var ov = document.getElementById('pdx-ip-overlay');
    var held = null;
    try {
      // Focus is only ours to move if it is still inside the overlay. If the reader
      // has since clicked into the page behind, leaving it where it is beats
      // yanking it back to a chip they have finished with.
      var ae = document.activeElement;
      if (ov && ae && ov.contains && ov.contains(ae)) held = _opener;
    } catch (e) {}
    if (ov) ov.hidden = true;
    _key = '';
    _opener = null;
    _state = null;
    try { document.documentElement.classList.remove('pdxip-lock'); } catch (e) {}
    if (!opts.fromPop) clearPath();
    // After the overlay is display:none, so the browser is not asked to focus
    // something it cannot see.
    if (held && typeof held.focus === 'function') {
      try { held.focus(); } catch (e) {}
    }
  }
  function isOpen() {
    var ov = document.getElementById('pdx-ip-overlay');
    return !!(ov && !ov.hidden);
  }
  function openBill(number, sitting) {
    if (!number) return;
    var bills = G('PDXBills');
    if (bills && typeof bills.open === 'function') { bills.open(number, sitting || ''); return; }
    var BD = G('PDXBillDetail');
    if (BD && typeof BD.open === 'function') { BD.open(number, sitting || ''); return; }
    try { location.hash = '#bill/' + encodeURIComponent(sitting || '') + '/' + encodeURIComponent(number); } catch (e) {}
  }

  function injectCss() {
    if (document.getElementById('pdxip-css')) return;
    if (!document.head || !document.createElement) return;
    var css = [
      'html.pdxip-lock{overflow:hidden;}',
      '.pdxip-overlay{position:fixed;inset:0;z-index:9200;display:flex;align-items:flex-start;justify-content:center;}',
      // WHY THIS LINE EXISTS. close() hides the overlay by setting the `hidden`
      // attribute, and `hidden` is display:none in the UA sheet only - an author
      // `display:flex` on the same element beats it outright, whatever the
      // specificity. Without this rule close() ran in full and the reader still
      // sat behind a backdrop that ate every tap: the X did nothing, the dimmed
      // page did nothing, and Escape - gated on ov.hidden, by then true - had
      // switched itself off. Every other overlay in the app pairs its display
      // rule with this one (.pdx-act-overlay, .pdx-impact-overlay); this one did not.
      '.pdxip-overlay[hidden]{display:none;}',
      '.pdxip-backdrop{position:absolute;inset:0;background:rgba(4,8,18,0.72);}',
      // A sheet, not a dumped div: the width cap was already here, the vertical
      // cap keeps it off the top and bottom edges on a tall screen, and the inner
      // padding below is what stops the content from starting at the border.
      '.pdxip-panel{position:relative;margin:max(3vh,0.9rem) auto;width:min(46rem,calc(100vw - 1.75rem));',
        'max-height:min(92vh,54rem);display:flex;flex-direction:column;background:linear-gradient(180deg,#101a2e,#0b1220);',
        'border:1px solid rgba(159,180,212,0.22);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,0.55);}',
      '.pdxip-x{position:absolute;top:0.35rem;right:0.4rem;min-width:2.5rem;min-height:2.5rem;background:none;',
        'border:0;color:#9fb4d4;font-size:1.35rem;line-height:1;cursor:pointer;z-index:2;}',
      '.pdxip-x:hover,.pdxip-x:focus-visible{color:#eef4ff;}',
      '.pdxip-scroll{overflow:auto;-webkit-overflow-scrolling:touch;padding:1.4rem 1.4rem 1.7rem;}',
      '@media (max-width:520px){.pdxip-scroll{padding:1.1rem 1rem 1.4rem;}}',
      '.pdxip-hd{padding-right:2.6rem;}',
      '.pdxip-chipw{display:flex;align-items:center;gap:0.25rem;}',
      '.pdxip-chip{display:inline-flex;align-items:center;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;',
        'font-size:1.15rem;line-height:1.2;color:#eef4ff;border:1px solid rgba(159,180,212,0.28);',
        'border-left:3px solid var(--pdx-ic,rgba(159,180,212,0.5));border-radius:10px;padding:0.3rem 0.6rem;}',
      '.pdxip-chipline{margin:0.5rem 0 0;font-size:0.86rem;line-height:1.5;color:#c9d8ee;}',
      '.pdxip-scope{margin:0.4rem 0 0;font-size:0.78rem;line-height:1.55;color:#b9cae3;}',
      '.pdxip-counts{margin:0.6rem 0 0;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;',
        'font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:#7596c0;}',
      '.pdxip-load{margin:1rem 0 0;font-size:0.82rem;color:#7596c0;}',
      '.pdxip-sect{margin-top:1.1rem;}',
      '.pdxip-h{margin:0 0 0.45rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.62rem;',
        'letter-spacing:0.12em;text-transform:uppercase;color:#7596c0;}',
      '.pdxip-rows,.pdxip-ps{list-style:none;margin:0;padding:0;}',
      '.pdxip-row+.pdxip-row{margin-top:0.5rem;}',
      '.pdxip-p+.pdxip-p{margin-top:0.35rem;}',
      // ON THE SITE'S OWN FACE. Nothing sets a font on buttons globally, so these
      // rows were rendering their titles and names in the browser's button font
      // while the header chip above them was in Barlow - which is most of why the
      // header read as on-theme and the list did not.
      '.pdxip-open,.pdxip-p-open{display:grid;grid-template-columns:auto 1fr auto;gap:0.15rem 0.5rem;width:100%;',
        'font-family:\'Barlow\',sans-serif;',
        'text-align:left;background:rgba(127,180,255,0.05);border:1px solid rgba(159,180,212,0.16);',
        'border-radius:12px;padding:0.6rem 0.7rem;color:#eef4ff;cursor:pointer;}',
      '.pdxip-open:hover,.pdxip-open:focus-visible,.pdxip-p-open:hover,.pdxip-p-open:focus-visible{',
        'background:rgba(127,180,255,0.12);border-color:rgba(159,180,212,0.32);}',
      // THE LOUD LINE. The number and the short title are the row, and they are
      // the largest type in it; everything else in the row is smaller than both.
      '.pdxip-num{font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:1.05rem;',
        'line-height:1.25;color:#9fdbff;white-space:nowrap;}',
      '.pdxip-ttl{font-weight:600;font-size:0.98rem;line-height:1.3;color:#eef4ff;}',
      // Pinned to its own column across both rows of the measure card. Left to
      // auto-placement it would follow the strip below the title into row two and
      // sit at the bottom-right corner of the card instead of beside it.
      '.pdxip-go{align-self:center;color:#7596c0;}',
      '.pdxip-open>.pdxip-go{grid-column:3;grid-row:1/span 2;}',
      // Under it, on one wrapping strip: the lane, then the roll line.
      '.pdxip-sub{grid-column:1/span 2;display:flex;flex-wrap:wrap;align-items:center;gap:0.3rem 0.5rem;',
        'margin-top:0.15rem;}',
      // A REAL BADGE, NOT FINE PRINT. Whether an act is the subject of this issue or
      // rode inside something larger is the single most load-bearing fact in the
      // row, and it was set in 0.58rem muted uppercase - smaller than the roll line
      // it sat above. It is a pill now, and it is the one thing in the row that
      // changes shape between the two lanes.
      '.pdxip-lane-t{display:inline-flex;align-items:center;font-family:\'Barlow Condensed\',sans-serif;',
        'font-weight:700;font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;line-height:1.3;',
        'padding:0.14rem 0.45rem;border-radius:9999px;border:1px solid rgba(159,180,212,0.3);',
        'color:#cbd9ee;background:rgba(127,180,255,0.07);white-space:nowrap;}',
      // One step heavier than the fine print beneath the title, which is what it
      // was indistinguishable from: chamber, date and the Yea-Nay are the facts a
      // reader scans a list of measures for.
      '.pdxip-meta{font-family:\'Barlow Condensed\',sans-serif;font-weight:600;font-size:0.84rem;',
        'letter-spacing:0.015em;line-height:1.3;color:#cfe0f7;}',
      // ── SUBJECT VS RIDER, AS A SHAPE ──────────────────────────────────────────
      // The issue's own colour at low alpha on the left edge of a row this issue is
      // the subject of. Riders keep the flat card - dimmer, thinner edge, no wash -
      // and are neither hidden nor folded away: a rider is still a mapping on file
      // and the list still prints every one of them.
      //   `--pdx-ic` arrives by inheritance from the section, so a boot without the
      // colour table falls back to the neutral rule underneath rather than to no
      // border at all, and a browser without color-mix drops only the wash.
      '.pdxip-row[data-pdxip-lane="subject"]>.pdxip-open{',
        'border-left:3px solid color-mix(in srgb,var(--pdx-ic,#9fb4d4) 55%,transparent);',
        'background:linear-gradient(90deg,color-mix(in srgb,var(--pdx-ic,#9fb4d4) 11%,transparent),',
        'rgba(127,180,255,0.05) 40%);}',
      '.pdxip-row[data-pdxip-lane="subject"] .pdxip-lane-t{color:#eef4ff;',
        'border-color:color-mix(in srgb,var(--pdx-ic,#9fb4d4) 55%,transparent);',
        'background:color-mix(in srgb,var(--pdx-ic,#9fb4d4) 20%,transparent);}',
      '.pdxip-row[data-pdxip-lane="rode"]>.pdxip-open{background:rgba(127,180,255,0.025);',
        'border-color:rgba(159,180,212,0.13);}',
      '.pdxip-row[data-pdxip-lane="rode"] .pdxip-lane-t{color:#9fb4d4;background:none;',
        'border-color:rgba(159,180,212,0.24);}',
      '.pdxip-note{margin:0.6rem 0 0;font-size:0.72rem;line-height:1.5;color:#7596c0;}',
      '.pdxip-empty-h{margin:0;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:1rem;color:#eef4ff;}',
      '.pdxip-empty-b{margin:0.35rem 0 0;font-size:0.78rem;line-height:1.55;color:#b9cae3;}',
      '.pdxip-fold{margin-top:1.2rem;border-top:1px solid rgba(159,180,212,0.14);padding-top:0.8rem;}',
      '.pdxip-fold-s{cursor:pointer;display:flex;flex-wrap:wrap;align-items:baseline;gap:0.4rem;}',
      '.pdxip-fold-t{font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.95rem;color:#eef4ff;}',
      '.pdxip-fold-g{font-size:0.72rem;color:#7596c0;}',
      '.pdxip-grp{margin-top:0.7rem;}',
      '.pdxip-grp-h{font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;',
        'letter-spacing:0.11em;text-transform:uppercase;color:#7596c0;margin-bottom:0.3rem;}',
      '.pdxip-p-name{font-size:0.88rem;}',
      '.pdxip-p-said{grid-column:2;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.6rem;',
        'letter-spacing:0.1em;text-transform:uppercase;color:#9fdbff;}',
      '.pdxip-p-pat{grid-column:2;font-size:0.74rem;color:#b9cae3;}',
      '.pdxip-p-cnt{color:#7596c0;font-style:normal;}',
      // A wait, dressed as a wait. Same sentence the tree uses, set apart from the
      // finished lines beside it so it cannot be mistaken for a finding while it
      // stands - and it does not stand for long, because the warm repaint replaces
      // it the moment the lane answers.
      '.pdxip-p-pat.is-warm{color:#7596c0;font-style:italic;}',
      '.pdxip-p-pat.is-warm b{font-style:normal;opacity:0.75;}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'pdxip-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  window.PDXIssuePage = {
    // The gate and the doors.
    has: has, open: open, close: close, isOpen: isOpen,
    current: function () { return _key; },
    // The builders, published for the same reason the scope card publishes its
    // markup: the copy and the order ARE the deliverable, and a test that can
    // only reach them through a live fetch is a test that checks neither.
    bodyHtml: bodyHtml, headHtml: headHtml, listHtml: listHtml, peopleHtml: peopleHtml,
    rowsFrom: rowsFrom, sortRows: sortRows, rowHtml: rowHtml, rollLine: rollLine,
    counts: counts, countsLine: countsLine, peopleRows: peopleRows,
    load: load,
    // The copy, as data.
    EMPTY: EMPTY, SUBJECT: SUBJECT, RODE: RODE, BUCKETS: BUCKETS,
    PKG_NOTE: PKG_NOTE, PEOPLE_TITLE: PEOPLE_TITLE, PEOPLE_WALL: PEOPLE_WALL
  };
})();
