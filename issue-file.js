/* ─────────────────────────────────────────────────────────────────────────────
   issue-file.js — the panel /i/<key> opens in
   ─────────────────────────────────────────────────────────────────────────────
   THE FILE HAD AN ADDRESS AND NO STAGE.

   pdx-issue-profile.js gave the child ledger a citation: /i/lands_preserve
   resolves the key, commits the same pick a chip tap commits, warms the same
   record and paints the same census. What it did not have was a DESTINATION. The
   arrival went through window.pdxDoor1Issue and stopped there, and
   pdxDoor1Issue's job is to paint the desk — so a reader who followed a citation
   landed on the homepage: the hero first ("Live from the record"), the whole of
   Door 1's chrome next ("One desk…", the four ways in, the core shelf), the
   ledger they were sent to somewhere below the fold, and a "Next in Door 1"
   footer under it. /p/<pid> does not do that. It hides the homepage and opens a
   file. This module is that stage for /i/.

   WHAT IT IS NOT
     It is NOT a second ledger. There is exactly one builder for an issue's
     census, bands and measures — door1-workspace.js's issueProfileHtml, exported
     as PDXDoor1.issueProfile and delegated by PDXIssueProfile.html — and this
     file calls it and mounts the string it returns. Unmodified: the ledger host
     below holds html(key) and nothing else, which is what lets a test assert
     BYTE EQUALITY between what the panel shows and what the builder returns. No
     count, no order, no band, no percentage and no party token is computed,
     re-ordered or re-worded here. Search this file: there is no arithmetic in it.
     The letterhead above the host does not change that. Its integers arrive from
     the desk's own census (PDXDoor1.issueCensus) already counted, and are printed
     in the order and with the labels that census hands over.

   WHAT THE CHROME AROUND IT MAY SAY
     The person file's answer, in the issue file's words. Four things, all of them
     identity, none of them a finding:
       · the surface and its citable address — "Issue file · /i/lands_preserve",
         the pf-kick line's own idea;
       · the issue's label, which is the file's name;
       · the ⓘ that opens what the key covers — and ONLY when issue-scope.js
         already holds prose for it, because controlHtml() answers '' otherwise
         and a control that explains nothing is worse than no control;
       · the crumb, core → child. The CHILD half is text — it is this file, so
         there is nowhere for it to go — and the CORE half is a button, because a
         core is a family and a family has no file: tapping it closes this panel
         and opens the desk on that shelf, which is the only honest destination.
         Never an anchor on /i/<core>; pdx-issue-profile.js refuses that address
         and this module does not offer a second opinion.
     A FIGURE in this bar is still out of the question. It would outrank the
     census two lines under it, which is the same reason person-file.js's kicker
     carries no Direction Match. The inventory lives under the bar, inside the
     scroll, in the letterhead — see below.

   THE LETTERHEAD, AND WHY IT IS THE ONLY NEW COPY HERE
     Identity then census left one question unanswered on a page whose whole job
     is to be citable: what does this key MEAN, and how much is filed under it?
     So the first block inside the scrolling body — above the builder's string,
     never inside it — prints the key's own chip, the locked scope prose out of
     issue-scope.js (or that module's own "no definition on file yet", which is
     the honest blank and not a paraphrase), an inventory line of integers, and
     two jumps: the desk scoped to this key, and this file's address.
     Every one of those already existed somewhere on the site. The integers come
     from PDXDoor1.issueCensus — the desk publishing the read it already ran, so
     the line at the top and the prose in the middle are one census and not two.
     And while that read is still out, the line publishes NO integer: it says it
     is reading and it says the rows below are what is on file so far, because a
     headline count that is about to change is worse than no headline at all.
     What is NOT up there: no percentage, no ranking, no grade, no caucus token,
     no "backs up their words", and no stance inferred from the pattern below.

   THE BAR WEARS THE FAMILY'S COLOUR, FROM THE ONE PALETTE
     A child chip on Door 1's shelf is already painted in its family's hue, and
     following that chip's own citation used to land the reader on a bar in the
     desk's generic blue — the same file, in a different livery, which reads as a
     different surface. So the identity block asks PDXIssueColors.skin(key) for
     the treatment, exactly as the shelf does: `data-ic` plus the four --pdx-ic*
     custom properties, and the family table (PDXIssueFamily.coreOf) handed in as
     the lookup so the file's hue and the chip's hue come off ONE read and cannot
     drift apart. skin() answers an empty attribute for a key that lands on no
     Core National Issue, and an empty attribute is the whole fallback: with no
     `data-ic` on the block, every rule in issue-file.css keyed to it drops out
     and the bar is the chrome it has always been. No hex is authored in this
     module or its stylesheet — a colour on this bar came from issue-colors.js or
     it is not a family colour.

   THE DESK IS STILL PAINTED, BEHIND IT
     Deliberately. The arrival commits through pdxDoor1Issue, so the desk holds
     the same pick and paints the same ledger — which is what makes "the numbers
     at /i/<key>" and "the numbers on the desk" the same numbers by construction
     rather than by agreement. What changed is only which of the two the reader is
     looking at when they arrive by address. A chip tap on / still opens the desk
     in place and is untouched: that is a VIEW of the file, and the desk is where
     views live.

   ONE WAY OUT, THE PERSON FILE'S WAY
     Close is the X, Escape, or the backdrop — and it hands the address back to
     PDXIssueProfile.restore(), which owns the bar for /i/ exactly as
     person-file.js owns it for /p/. This module never writes location itself.

   Z-ORDER, ON PURPOSE
     50, inserted before #modal-overlay. The number clears the homepage's own
     fixed z-50 top nav, which at 49 would float over a file reached by citation.
     The position settles the tie with the person modal, which is also 50: a row
     in this ledger opens a person file, and that file has to land on top of this
     one and reveal it again on close. Every floating rail on the page (45, 47,
     48) stays under both.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXIssueFile) return;

  var ID = 'pdx-issue-file';
  var ID_CHROME = 'pdx-issue-file-chrome';
  var ID_HEAD = 'pdx-issue-file-head';
  var ID_LEDGER = 'pdx-issue-file-ledger';
  var ID_TITLE = 'pdx-issue-file-title';
  var ARROW = ' → ';
  var SEP = ' · ';

  function fn(x) { return typeof x === 'function'; }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function desk() { return window.PDXDoor1 || null; }
  function addr() { return window.PDXIssueProfile || null; }
  function family() { return window.PDXIssueFamily || null; }
  function colors() {
    var C = window.PDXIssueColors;
    return (C && fn(C.skin) && fn(C.styleFor)) ? C : null;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }
  // A key inside a single-quoted JS string inside a double-quoted attribute. The
  // desk's own jsq(), spelled the same way, because both doors paint the same keys
  // into the same shape of inline handler.
  function jsq(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  // ── THE ONE LEDGER PAINT ──────────────────────────────────────────────────
  // The address module first, because that is the published door for this string
  // and asking it keeps one caller between this file and the desk. The desk
  // itself is the fallback for a document that somehow has the builder and not
  // the address module. '' means "no single ledger lives at this address" — a
  // bundle key, or no builder on the page — and it is passed straight through as
  // a refusal to open rather than turned into an empty file.
  function ledger(key) {
    var A = addr();
    if (A && fn(A.html)) {
      try {
        var body = A.html(key);
        if (body) return body;
      } catch (e) {}
    }
    var D = desk();
    if (D && fn(D.issueProfile)) {
      try { return D.issueProfile(key) || ''; } catch (e) {}
    }
    return '';
  }

  // ── The chrome's four strings, each from its existing owner ───────────────
  function labelOf(key) {
    var D = desk();
    try { if (D && fn(D.issueLabelFor)) return D.issueLabelFor(key) || key; } catch (e) {}
    return key;
  }
  function crumbOf(key) {
    var F = family();
    if (!F || !fn(F.crumb)) return null;
    try {
      var c = F.crumb(key);
      return (c && c.coreLabel) ? c : null;
    } catch (e) { return null; }
  }
  function arrow() {
    var F = family();
    try { if (F && F.ARROW) return String(F.ARROW); } catch (e) {}
    return ARROW;
  }
  function pathOf(key) {
    var A = addr();
    if (!A || !fn(A.path)) return '';
    try { return A.path(key) || ''; } catch (e) { return ''; }
  }
  // ⓘ, and only where there is something behind it. issue-scope.js answers ''
  // for a key it holds no prose for, which is the whole condition.
  function scopeControl(key) {
    var S = window.PDXIssueScope;
    if (!S || !fn(S.controlHtml)) return '';
    try { return S.controlHtml(key) || ''; } catch (e) { return ''; }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE LETTERHEAD  ·  what this file is, before what the record did
  // ══════════════════════════════════════════════════════════════════════════
  // WHAT WAS MISSING. The panel had identity (surface, address, label, ⓘ, crumb)
  // and then the ledger. So a reader who followed a citation to /i/climate_action
  // was told the key's NAME and then handed a census — and never told what the
  // key MEANS, how much is filed under it, or how to get back to the shelf it
  // came off. Every one of those answers already existed somewhere on the site;
  // none of them was on the file.
  //
  // So the letterhead prints them, and it is the only new copy in this pass:
  //   · the KEY CHIP — the register's own one-line statement of the key, out of
  //     ISSUE_MAP, read through PDXIssueScope.read() because that module already
  //     owns that read and a second reader of ISSUE_MAP is a second vocabulary;
  //   · the LOCKED SCOPE PROSE — issue-scope.js's `inn`, the argued boundary, and
  //     its own NO_DEF sentence when the key's scope was never written down. Not
  //     paraphrased, not summarised, and never invented from the pattern below;
  //   · the INVENTORY — integers, from the desk's published census and nowhere
  //     else (PDXDoor1.issueCensus, which is issueLedger, which is what the body
  //     prints two inches down). Counts only: no percentage, no share, no grade,
  //     no ranking, no caucus token, and nothing about whether anybody backed up
  //     their words — that is a different lane and it is not on this page;
  //   · TWO JUMPS — the desk scoped to this key, and the link. No third.
  //
  // THE BUSY GATE. The ledger below says "Reading the full record for N more…"
  // while the roll-call read is still arriving, and its census moves under that
  // sentence. A letterhead that published an inventory at the same moment would
  // be printing a headline figure it is about to change, at the top of the page,
  // where it outranks everything. So while a read is out this block publishes NO
  // integer at all: it says it is reading, and it says the rows underneath are
  // what is on file so far. repaint() runs on every batch, so the inventory
  // appears when — and only when — that sentence is gone.
  //
  // STILL NO ARITHMETIC. Every integer here arrived from the desk's census as an
  // integer and is printed as it arrived. This module adds nothing, divides
  // nothing, sorts nothing and compares nothing.
  var NO_DEF = 'No definition on file yet.';
  var BUSY = 'Reading the record on this key…';
  var SO_FAR = 'The rows below are what is on file so far — not the final count.';
  // The formal-record index's five band ids, and the shortest honest word for
  // each on a single line. The ids and the ORDER are the index's own — they
  // arrive on the census, they are not listed here — and a band this table has no
  // word for falls back to the index's own label rather than being dropped, so a
  // sixth band cannot go missing from the inventory by omission.
  var BAND_WORD = {
    advanced: 'advanced',
    against: 'cut against',
    both: 'ran both ways',
    thin: 'too thin',
    none: 'no side'
  };

  function census(key) {
    var D = desk();
    if (!D || !fn(D.issueCensus)) return null;
    try { return D.issueCensus(key) || null; } catch (e) { return null; }
  }
  // A read is still out — the ledger below is saying so in its own words, and
  // nothing up here may publish a figure until it stops.
  function reading(c) { return !!(c && (c.cold || c.pending));  }

  // The register's own line about the key. '' when issue-scope.js is not on the
  // page or does not carry the key, because a chip this file wrote itself would
  // be a definition nobody argued.
  function chipOf(key) {
    var S = window.PDXIssueScope;
    if (!S || !fn(S.read)) return '';
    try {
      var r = S.read(key);
      return (r && r.chip) ? String(r.chip) : '';
    } catch (e) { return ''; }
  }
  // The boundary, or the honest blank in issue-scope.js's own words. The literal
  // below is the fallback for a document served without that module and is the
  // same sentence it publishes — read live where that is possible so the two
  // cannot drift.
  function scopeProse(key) {
    var S = window.PDXIssueScope;
    var blank = NO_DEF;
    try { if (S && S.NO_DEF) blank = String(S.NO_DEF); } catch (e) {}
    var r = null;
    try { if (S && fn(S.read)) r = S.read(key); } catch (e) { r = null; }
    if (r && r.defined && r.inn) return { defined: true, text: String(r.inn) };
    return { defined: false, text: blank };
  }

  // Counts, joined. A bucket that is zero is DROPPED rather than printed as a 0 —
  // the ledger below already says what an empty band means, and a row of noughts
  // on a letterhead reads as a verdict.
  function inventoryLine(c) {
    if (!c) return '';
    var parts = [];
    if (c.people) {
      parts.push(c.people + ' ' + (c.people === 1 ? 'person' : 'people') + ' with a readable row');
    }
    (c.bands || []).forEach(function (b) {
      if (!b || !b.n) return;
      parts.push(b.n + ' ' + (BAND_WORD[b.id] || String(b.lb || b.id).toLowerCase()));
    });
    if (c.measures) {
      parts.push(c.measures + ' measure' + (c.measures === 1 ? '' : 's') + ' mapped');
    }
    return parts.join(SEP);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HOW THIS ISSUE WAS TESTED
  // ══════════════════════════════════════════════════════════════════════════
  // WHAT WAS MISSING. The inventory above says how BIG the file is. It does not
  // say how the issue MOVED — whether the record on this key is four standalone
  // resolutions the floor voted on directly or one line folded inside an
  // appropriations package, whether the acts behind it are votes or
  // sponsorships, and whether anybody who stated a position on it has a formal
  // row pointing the other way. Two keys can have the same band figures and
  // completely different answers to all three, and the difference is most of
  // what the file means.
  //
  // NONE OF IT IS COMPUTED HERE. `c.proc` arrives off the desk's published
  // census, already resolved — the act names come out of the act layer's own
  // vocabulary, so a sponsorship is called a lead sponsorship and never a vote,
  // and the menu sentence is a phrase locked in the record lane and asked for by
  // key. This block chooses which of those strings to print, drops the ones that
  // are zero, and joins them. It adds nothing, divides nothing and compares
  // nothing.
  //
  // IT DOES NOT REPRINT THE MEASURES. The cards are two inches down, with their
  // numbers, their titles, their PRIMARY-vs-provision labels and the names on
  // each side. So the measure line summarises and hands the reader down to them
  // through the anchors the desk published — the section's own, on the heading's
  // "See the measures", and one per band, on each figure in the measures row.
  // One list of measures on this page, and now several ways into the part of it
  // a given figure is about.
  //
  // SAME BUSY GATE AS THE INVENTORY, and for the same reason: a process line is
  // made of the same counts, so publishing one while the read is out would put a
  // figure at the top of the page that is about to change. headHtml() gates both
  // blocks on one call, so the two can never disagree about whether the file has
  // settled.
  //
  // AND THE THREE MEASURE FIGURES NOW PARTITION, which is what lets each of them
  // be a door. They are the bands the measure list below is filed into — the
  // label on the card, with floor-machinery-only instruments in their own band —
  // so every measure is in exactly one, the three sum to the total, and a reader
  // can check the arithmetic by counting cards. The note says they sum, because
  // three integers on one line read as a breakdown either way and a breakdown
  // whose behaviour is not stated is the arithmetic lie this whole pane is
  // written against. Earlier this line counted `procedural` a second time inside
  // the first two and the note existed to excuse the non-sum; the count moved
  // when the list gained bands, so the excuse went with it.
  var PROC_H = 'How this issue was tested';
  // ── TWO LINES, TWO DIFFERENT QUESTIONS, AND THE NOTE SAYS SO ──────────────
  // The measures line's PRIMARY is a label on the BILL: curation decided the
  // measure was about this issue rather than merely carrying it. The people
  // line's "primary-only" is a shape in one PERSON's record: every mapped act
  // they took on this key was a vote on the measure itself rather than a narrow
  // slice inside something larger. Those are separate reads of separate things
  // — a key can hold no PRIMARY measure at all and still have people whose acts
  // on it were all standalone votes — so the two lines genuinely can disagree,
  // and a reader who is not told that will read the disagreement as an error.
  // Said here, in the note, rather than by renaming either line: both sets of
  // words are the ones the surfaces above and below this block already use.
  var PROC_NOTE = 'Counts of what is on file, not a reading of it. PRIMARY and provision ' +
    'are the labels on the measures, and procedural means every act on file for that ' +
    'measure was floor machinery — the three are the bands the list below is filed ' +
    'into, so they add up to the number of measures mapped here and each measure is ' +
    'in exactly one of them. The people line asks a different question — how ' +
    'each person\'s own acts on this key travelled, a vote on the measure itself or ' +
    'one folded inside something larger — so it can read differently from the label ' +
    'on the bill.';
  var PROC_SEE = 'See the measures';

  function procRow(lb, text) {
    if (!text) return '';
    return '<p class="pdxif-prow"><span class="pdxif-plb">' + esc(lb) + '</span>' +
      '<span class="pdxif-pv">' + esc(text) + '</span></p>';
  }
  // ── THE MEASURES ROW IS THREE DOORS, NOT THREE WORDS ──────────────────────
  // WHAT WAS MISSING. "8 PRIMARY · 2 provision" told a reader the shape of the
  // list and then left them to scroll and find the shape for themselves. The
  // cards are now filed into those same bands, so each figure has somewhere to
  // land: tapping it puts the reader on that band's heading rather than at the
  // top of a list they have to scan.
  //   THE FIGURES AND THE ANCHORS BOTH ARRIVE ON THE CENSUS. `bands` is the
  // desk's own list of what it printed — id, label, count, and the id that band
  // wears — so this row joins strings and adds nothing. The ids are published
  // for the same reason the section's own id is: this file may not spell the
  // desk's markup, and an anchor it composed itself would break the first time
  // the desk renamed one.
  //   AND THEY ADD UP. The three are a partition of the measure list, so the
  // note under this block says they sum to the total instead of excusing a
  // breakdown that does not.
  function measBandRow(m) {
    var bands = (m && m.bands) || [];
    var out = [];
    bands.forEach(function (b) {
      if (!b || !b.n) return;
      var lb = b.n + ' ' + String(b.lb || b.id);
      out.push(b.at
        ? '<button type="button" class="pdxif-pjump" ' +
            'onclick="return window.PDXIssueFile.seeMeasures(\'' + jsq(b.at) + '\')" ' +
            'aria-label="' + esc('See the ' + lb + ' measures on the list below') + '">' +
            esc(lb) + '</button>'
        : esc(lb));
    });
    if (!out.length) return '';
    return '<p class="pdxif-prow"><span class="pdxif-plb">Measures</span>' +
      '<span class="pdxif-pv">' + out.join(SEP) + '</span></p>';
  }
  function peopleLine(o) {
    if (!o) return '';
    var parts = [];
    if (o.primary) parts.push(o.primary + ' primary-only');
    if (o['package']) parts.push(o['package'] + ' package-only');
    if (o.mixed) parts.push(o.mixed + ' mixed');
    return parts.join(SEP);
  }
  function actLine(list) {
    var parts = [];
    (list || []).forEach(function (a) { if (a && a.lb) parts.push(String(a.lb)); });
    return parts.join(SEP);
  }
  function stanceLine(o) {
    if (!o || !o.said) return '';
    var parts = [o.said + ' sourced stance' + (o.said === 1 ? '' : 's') + ' on this key'];
    if (o.crossed) {
      parts.push(o.crossed + ' whose formal row runs the other way');
    }
    return parts.join(SEP);
  }
  function seeHtml(id) {
    if (!id) return '';
    return '<button type="button" class="pdxif-see" ' +
      'onclick="return window.PDXIssueFile.seeMeasures(\'' + jsq(id) + '\')">' +
      esc(PROC_SEE) + '</button>';
  }
  function procHtml(c) {
    var pr = c && c.proc;
    if (!pr) return '';
    var m = measBandRow(pr.measures);
    var body = m +
      procRow('People', peopleLine(pr.people)) +
      procRow('Acts', actLine(pr.acts)) +
      procRow('Stances', stanceLine(pr.stances));
    if (!body) return '';
    var mu = pr.menu || null;
    return '<div class="pdxif-proc">' +
        '<p class="pdxif-ph">' + esc(PROC_H) + (m ? seeHtml(pr.measures && pr.measures.id) : '') + '</p>' +
        body +
        (mu && mu.lb
          ? '<p class="pdxif-pmenu"><b>' + esc(mu.lb) + '</b>' +
            (mu.note ? ' <span class="pdxif-pmn">' + esc(mu.note) + '</span>' : '') + '</p>'
          : '') +
        (m ? '<p class="pdxif-pn">' + esc(PROC_NOTE) + '</p>' : '') +
      '</div>';
  }

  // ── THE TWO JUMPS ─────────────────────────────────────────────────────────
  // The desk, scoped to this key — the surface this body also lives on, reached
  // through the desk's ONE issue door — and the link, which is this file's own
  // address. There is no "add to team" and no third control: a file is a
  // citation, and the two things a reader wants from one are the shelf it came
  // off and the string they can paste.
  function jumpsHtml(key) {
    var p = pathOf(key);
    return '<p class="pdxif-jumps">' +
        '<button type="button" class="pdxif-jump" ' +
          'onclick="return window.PDXIssueFile.deskJump(\'' + jsq(key) + '\')" ' +
          'aria-label="' + esc('Open the issue desk on ' + labelOf(key)) + '">' +
          'Desk<span class="pdxif-jump-h">scoped to this key</span></button>' +
        '<button type="button" class="pdxif-jump" ' +
          'onclick="return window.PDXIssueFile.share(\'' + jsq(key) + '\')" ' +
          'aria-label="' + esc('Copy the link to this issue file') + '">' +
          'Share<span class="pdxif-jump-h">' + esc(p ? 'copy ' + p : 'copy the link') +
          '</span></button>' +
      '</p>';
  }

  function headHtml(key) {
    var c = census(key);
    var chip = chipOf(key);
    var sc = scopeProse(key);
    var inv = reading(c) ? '' : inventoryLine(c);
    return '<div class="pdxif-head"' + skinAttr(key) + '>' +
        (chip ? '<p class="pdxif-chip">' + esc(chip) + '</p>' : '') +
        '<p class="pdxif-scope' + (sc.defined ? '' : ' is-blank') + '">' + esc(sc.text) + '</p>' +
        (reading(c)
          ? '<p class="pdxif-busy" role="status">' + esc(BUSY) +
              '<span class="pdxif-sofar">' + esc(SO_FAR) + '</span></p>'
          : (inv ? '<p class="pdxif-inv">' + esc(inv) + '</p>' : '')) +
        (reading(c) ? '' : procHtml(c)) +
        jumpsHtml(key) +
      '</div>';
  }

  // ── The family's colour, off the one palette ──────────────────────────────
  // The lookup Door 1 hands the palette for a chip, spelled the same way: a
  // function over PDXIssueFamily.coreOf. undefined when the family table is not
  // on the page, which is not a failure — the palette then falls back to its own
  // globals (window.coreIssueForKey, CORE_NATIONAL_ISSUES) and usually resolves
  // the key anyway.
  function familyLookup() {
    var F = family();
    if (!F || !fn(F.coreOf)) return undefined;
    return function (k) { try { return F.coreOf(k) || ''; } catch (e) { return ''; } };
  }
  // ' data-ic="on" style="--pdx-ic:…"' for a key that lands on a Core National
  // Issue, and '' for every other case — no palette on the page, no resolution,
  // a throw. '' is the fallback the stylesheet is written around: nothing to hook
  // means the bar keeps the chrome it had before the treatment existed.
  function skinAttr(key) {
    var C = colors();
    if (!C || !key) return '';
    try { return (C.skin(key, familyLookup()) || {}).attr || ''; } catch (e) { return ''; }
  }

  function chromeHtml(key) {
    var p = pathOf(key);
    var c = crumbOf(key);
    // ONE ELEMENT CARRIES THE TREATMENT. The four properties are set on the
    // identity block and inherited by the title, the crumb and the rail beside
    // them, so there is exactly one place in this file where a hue is applied
    // and exactly one attribute a test has to read.
    return '<div class="pdxif-bar"' + skinAttr(key) + '>' +
        '<p class="pdxif-kick">' +
          '<span class="pdxif-kick-what">Issue file</span>' +
          (p ? '<a class="pdxif-kick-addr" href="' + esc(p) + '">' + esc(p) + '</a>' : '') +
        '</p>' +
        '<h2 class="pdxif-title" id="' + ID_TITLE + '">' +
          '<span class="pdxif-name">' + esc(labelOf(key)) + '</span>' +
          scopeControl(key) +
        '</h2>' +
        (c
          ? '<p class="pdxif-crumb">' +
              // ── THE FAMILY CRUMB IS A DOOR NOW, AND IT OPENS THE DESK ─────
              // It was a caption on the grounds that the ledger's own crumb (in
              // the body, from the one builder) was the live one. On a file that
              // is the whole screen that reasoning fails: the desk's crumb is
              // below the fold on a phone, and the family shelf is the one place
              // a reader who arrived at the wrong key has to get to. So the core
              // half is a control — window.pdxDoor1Issue, the desk's ONE issue
              // door, the same call the shelf's chips and the ledger's own crumb
              // make. Never an anchor on /i/<core>: a core is a family, it has no
              // file at that address, and this pass is not the one that invents
              // one. The child half stays text, because that is this file.
              '<button type="button" class="pdxif-core"' +
                ' onclick="return window.PDXIssueFile.familyJump(\'' + jsq(c.core) + '\')"' +
                ' aria-label="' + esc('Open the issue desk on ' + c.coreLabel) + '">' +
                esc(c.coreLabel) + '</button>' +
              '<span class="pdxif-arrow" aria-hidden="true">' + esc(arrow()) + '</span>' +
              '<span class="pdxif-child">' + esc(c.childLabel) + '</span>' +
            '</p>'
          : '') +
      '</div>';
  }

  // ── The stage ─────────────────────────────────────────────────────────────
  // Built once, from real elements rather than one innerHTML, for two reasons:
  // the close control keeps its own listener across a chrome repaint (it is a
  // SIBLING of the identity block, not inside it), and the ledger host is a node
  // this module can hand exactly one string to.
  var _key = '';
  var _open = false;
  var _built = false;

  function build() {
    if (_built) return el(ID);
    var d;
    try { d = document; } catch (e) { return null; }
    if (!d || !fn(d.createElement) || !d.body) return null;

    var overlay = d.createElement('div');
    overlay.id = ID;
    overlay.className = 'pdxif';
    overlay.hidden = true;
    try {
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', ID_TITLE);
      overlay.setAttribute('aria-hidden', 'true');
    } catch (e) {}
    try { overlay.style.display = 'none'; } catch (e) {}

    var panel = d.createElement('div');
    panel.className = 'pdxif-panel';

    var top = d.createElement('div');
    top.className = 'pdxif-top';

    var idHost = d.createElement('div');
    idHost.id = ID_CHROME;
    idHost.className = 'pdxif-id';

    var x = d.createElement('button');
    x.className = 'pdxif-x';
    try {
      x.setAttribute('type', 'button');
      x.setAttribute('aria-label', 'Close the issue file');
      x.setAttribute('title', 'Close');
    } catch (e) {}
    try {
      x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
    } catch (e) {}
    try { x.addEventListener('click', function () { close(); }); } catch (e) {}

    var body = d.createElement('div');
    body.className = 'pdxif-body';

    // The letterhead, and the ledger under it. Two hosts rather than one, for the
    // same reason the chrome is its own host: the ledger host holds the builder's
    // string and NOTHING else, so byte equality with PDXDoor1.issueProfile(key)
    // stays assertable. Every word this module writes is outside that node.
    var head = d.createElement('div');
    head.id = ID_HEAD;
    head.className = 'pdxif-headhost';

    var led = d.createElement('div');
    led.id = ID_LEDGER;
    led.className = 'pdxif-led';

    try { body.appendChild(head); body.appendChild(led); } catch (e) {}
    try { top.appendChild(idHost); top.appendChild(x); } catch (e) {}
    try { panel.appendChild(top); panel.appendChild(body); } catch (e) {}
    try { overlay.appendChild(panel); } catch (e) {}
    // WHERE IN THE DOCUMENT, AND WHY IT IS NOT THE END OF IT. This panel and the
    // person modal are both z-index 50, so the one that wins is the one that
    // comes later in <body>. Appending would make that this panel — and a person
    // opened from a row INSIDE this file would then open underneath the file it
    // was opened from. Inserting immediately before #modal-overlay gives the
    // reader the only order that reads: the homepage's fixed nav is covered, the
    // issue file covers it, and a person lands on top of both. Appended at the
    // end only when that overlay is not on the page at all.
    try {
      var host = el('modal-overlay');
      if (host && host.parentNode === d.body && fn(d.body.insertBefore)) {
        d.body.insertBefore(overlay, host);
      } else {
        d.body.appendChild(overlay);
      }
    } catch (e) {
      try { d.body.appendChild(overlay); } catch (e2) { return null; }
    }
    if (!el(ID)) return null;

    // The backdrop, and only the backdrop. A click that started inside the panel
    // must not close the file it is in.
    try {
      overlay.addEventListener('click', function (ev) {
        if (ev && ev.target === overlay) close();
      });
    } catch (e) {}

    _built = true;
    return overlay;
  }

  // ── Open ──────────────────────────────────────────────────────────────────
  // Answers false rather than opening an empty file: a bundle key has no single
  // ledger (its member keys are the records, and which one a reader meant is
  // theirs to say on the desk's sub-key shelf), and a document with no builder on
  // it has nothing to show. Both are the caller's cue to fall back to the desk,
  // which is what pdx-issue-profile.js does with the answer.
  function open(key) {
    var k = String(key == null ? '' : key).trim();
    if (!k) return false;
    var body = ledger(k);
    if (!body) return false;
    var overlay = build();
    if (!overlay) return false;
    var host = el(ID_LEDGER);
    if (!host) return false;

    var idHost = el(ID_CHROME);
    if (idHost) { try { idHost.innerHTML = chromeHtml(k); } catch (e) {} }
    // THE BODY IS THE BUILDER'S STRING AND NOTHING ELSE. Every piece of chrome
    // this module adds is outside this node.
    try { host.innerHTML = body; } catch (e) { return false; }
    // The letterhead reports on the body, so it is painted after it — same tick,
    // same warm record, same census the string above was built from.
    var headHost = el(ID_HEAD);
    if (headHost) { try { headHost.innerHTML = headHtml(k); } catch (e) {} }

    _key = k;
    _open = true;
    try { overlay.hidden = false; } catch (e) {}
    try { overlay.setAttribute('aria-hidden', 'false'); } catch (e) {}
    try {
      overlay.style.setProperty('display', 'flex', 'important');
    } catch (e) {
      try { overlay.style.display = 'flex'; } catch (e2) {}
    }
    // The page under the file does not scroll while the file is over it — the
    // same lock openModal takes for a person, plus a watch on the one thing that
    // gives it back while this file is still open (see watchModal).
    lock();
    watchModal();
    // A file opens at its top. A second file opened out of the first would
    // otherwise start halfway down the previous one's bands.
    try {
      var scroller = overlay.querySelector ? overlay.querySelector('.pdxif-body') : null;
      if (scroller) scroller.scrollTop = 0;
    } catch (e) {}
    return true;
  }

  // ── RAISING A FILE THAT IS ALREADY OPEN ───────────────────────────────────
  // A reader can ask for a file they are already looking at: the Eye's leaf row
  // tapped from /i/<key>, or tapped twice. Answering "already open" with nothing
  // is indistinguishable from a broken row, so the file is RAISED instead — the
  // display and aria state re-asserted (a surface that hid this overlay without
  // closing it is exactly the case that reads as a dead tap), and the keyboard
  // put inside the panel rather than left wherever the tap came from, which is
  // what makes the raise reach a reader who is not looking at the screen.
  //
  // Nothing is repainted and nothing scrolls back to the top: the ledger under
  // this chrome is where the reader left it, and losing their place would be a
  // worse answer than none. Answers false when there is no open file to raise,
  // so a caller can tell a raise from an open.
  function focus() {
    if (!_open) return false;
    var overlay = el(ID);
    if (!overlay) return false;
    try { overlay.hidden = false; } catch (e) {}
    try { overlay.setAttribute('aria-hidden', 'false'); } catch (e) {}
    try {
      overlay.style.setProperty('display', 'flex', 'important');
    } catch (e) {
      try { overlay.style.display = 'flex'; } catch (e2) {}
    }
    lock();
    // The panel itself, not the close button: focusing the one control in this
    // chrome would put Escape and Enter on "dismiss the thing you just asked
    // for". tabindex is set here rather than in build() because it exists for
    // this call and nothing else.
    try {
      var panel = overlay.querySelector ? overlay.querySelector('.pdxif-panel') : null;
      if (panel) {
        try { panel.setAttribute('tabindex', '-1'); } catch (e) {}
        if (fn(panel.focus)) panel.focus();
      }
    } catch (e) {}
    return true;
  }

  // ── THE LOCK, AND THE ONE THING THAT DROPS IT ─────────────────────────────
  // A ledger row opens a person, and the person file is the modal that has
  // always owned this page: it takes the same body lock on open and CLEARS it on
  // close, because until now nothing else could be underneath it. Opened from
  // inside an issue file, that close would hand the homepage its scroll back
  // while the file is still over it — so the reader's next wheel gesture moves a
  // page they cannot see and the file closes onto somewhere else entirely.
  //
  // The fix is watched rather than negotiated: closeModal is not edited, and this
  // module does not ask it to behave differently. The person overlay's own
  // display attribute is the signal, and the lock is simply re-taken when it goes
  // away. Nothing here reads, paints or closes the person file; it only notices
  // that the page beneath THIS file became scrollable and says no again.
  function lock() {
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  }

  var _watch = null;
  function watchModal() {
    if (_watch) return;
    var M = window.MutationObserver;
    if (!fn(M)) return;
    var over = el('modal-overlay');
    if (!over) return;
    try {
      _watch = new M(function () {
        if (!_open) return;
        try {
          if (document.body && document.body.style.overflow !== 'hidden') lock();
        } catch (e) {}
      });
      _watch.observe(over, { attributes: true, attributeFilter: ['style', 'class'] });
    } catch (e) { _watch = null; }
  }
  function unwatchModal() {
    if (!_watch) return;
    try { _watch.disconnect(); } catch (e) {}
    _watch = null;
  }

  // ── Repaint ───────────────────────────────────────────────────────────────
  // The ledger's roll-call read arrives in batches and fires 'pdx-issue-votes'
  // per batch; the desk re-syncs on it. So does this panel, through the same one
  // builder — otherwise a cold arrival would sit on the census the first batch
  // could see while the desk behind it counted the rest.
  function repaint() {
    if (!_open || !_key) return false;
    var body = ledger(_key);
    if (!body) return false;
    var host = el(ID_LEDGER);
    if (!host) return false;
    try { host.innerHTML = body; } catch (e) { return false; }
    // AND THE LETTERHEAD, ON THE SAME BATCH. This is what lifts the busy gate:
    // the inventory is withheld while the ledger is still saying it is reading,
    // so the paint that removes that sentence is the paint that has to publish
    // the integers. Withholding them and never coming back would be the worse
    // half of an honest gate.
    var headHost = el(ID_HEAD);
    if (headHost) { try { headHost.innerHTML = headHtml(_key); } catch (e) {} }
    return true;
  }

  // ── Close ─────────────────────────────────────────────────────────────────
  // opts.keepAddress: the bar has already moved (a back/forward pop off /i/), so
  // restoring it would fight the reader's own navigation. Every other close hands
  // the address back to the module that took it.
  function close(opts) {
    opts = opts || {};
    var overlay = el(ID);
    if (overlay) {
      try { overlay.hidden = true; } catch (e) {}
      try { overlay.setAttribute('aria-hidden', 'true'); } catch (e) {}
      try {
        overlay.style.setProperty('display', 'none', 'important');
      } catch (e) {
        try { overlay.style.display = 'none'; } catch (e2) {}
      }
    }
    // The ledger is dropped rather than left behind a hidden overlay: it is a
    // reading of a record that keeps arriving, and a stale one flashing up under
    // the next open is a worse first paint than an empty node.
    var host = el(ID_LEDGER);
    if (host) { try { host.innerHTML = ''; } catch (e) {} }
    var headHost = el(ID_HEAD);
    if (headHost) { try { headHost.innerHTML = ''; } catch (e) {} }
    _key = '';
    _open = false;
    unwatchModal();
    try { document.body.style.overflow = ''; } catch (e) {}
    if (!opts.keepAddress) {
      var A = addr();
      try { if (A && fn(A.restore)) A.restore(); } catch (e) {}
    }
    return true;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE THREE CONTROLS THIS MODULE OWNS
  // ══════════════════════════════════════════════════════════════════════════
  // All three are inline handlers in the markup above, all three answer FALSE so
  // the control they are on does nothing else, and none of them writes the
  // document's address — the file closes through close(), which hands /i/ back to
  // the module that took it.
  //
  // familyJump(core) · the crumb. A core is a FAMILY: its records are the keys filed
  // under it, and which one the reader meant is theirs to say on the shelf. So
  // this closes the file and lands the desk on the family through the desk's one
  // issue door, which is the same call the shelf's own chips make. It does not
  // navigate to /i/<core>, because there is no file at that address and
  // pdx-issue-profile.js refuses to pretend otherwise.
  //
  // deskJump(key) · the same body, on the desk, scoped to this key. The desk
  // behind this panel already holds the pick (the arrival committed it through
  // the same door), so this is a re-sync and a landing rather than a new reading.
  //
  // share(key) · the link. There is no issue lane in the share-card pipelines —
  // those cards are about a person's own act — so what a reader gets is the one
  // thing that is unambiguously theirs to paste: this file's address, from the
  // module that owns it. Copied where the platform allows it and printed in the
  // toast where it does not, so the answer is never "nothing happened".
  function familyJump(core) {
    var k = String(core == null ? '' : core).trim();
    if (!k) return false;
    close();
    try { if (fn(window.pdxDoor1Issue)) window.pdxDoor1Issue(k); } catch (e) {}
    var D = desk();
    try { if (D && fn(D.toDesk)) D.toDesk('issue'); } catch (e) {}
    return false;
  }
  function deskJump(key) {
    var k = String(key == null ? '' : key).trim();
    if (!k) return false;
    close();
    try { if (fn(window.pdxDoor1Issue)) window.pdxDoor1Issue(k); } catch (e) {}
    var D = desk();
    try { if (D && fn(D.toDesk)) D.toDesk('issue'); } catch (e) {}
    return false;
  }
  // ── DOWN TO THE CARDS, NOT A SECOND COPY OF THEM ──────────────────────────
  // The id comes off the census — the desk publishes the anchor its own measure
  // list wears — so this panel never has to know one class name inside the body
  // it mounts. It scrolls and it focuses; it does not open, close, filter or
  // re-render anything, and a missing anchor is a no-op rather than a jump to the
  // top of the page.
  function seeMeasures(id) {
    var n = null;
    try { n = document.getElementById(String(id == null ? '' : id)); } catch (e) { n = null; }
    if (!n) return false;
    try { n.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {
      try { n.scrollIntoView(); } catch (e2) {}
    }
    return false;
  }
  function said(msg) {
    try { if (fn(window._showToast)) window._showToast(msg); } catch (e) {}
  }
  function share(key) {
    var A = addr();
    var u = '';
    try { if (A && fn(A.url)) u = A.url(key) || ''; } catch (e) { u = ''; }
    if (!u) return false;
    try {
      var c = navigator && navigator.clipboard;
      if (c && fn(c.writeText)) {
        c.writeText(u).then(function () {
          said('Link copied — it opens this issue file ✓');
        }, function () { said(u); });
        return false;
      }
    } catch (e) {}
    said(u);
    return false;
  }

  // ── The keyboard, and the batches ─────────────────────────────────────────
  try {
    document.addEventListener('keydown', function (ev) {
      if (!_open || !ev) return;
      var k = ev.key || '';
      if (k !== 'Escape' && k !== 'Esc') return;
      // A popover inside the file owns Escape first — issue-scope.js's own card
      // is opened from this chrome, and closing the whole file out from under it
      // would take two surfaces down with one key. The card is READ, not closed
      // here: issue-scope.js binds its own Escape when the ⓘ is first built,
      // which is after this listener, so it closes its card on the same keypress
      // this one declines to act on.
      try {
        var card = el('pdxis-card');
        if (card && card.hidden === false) return;
      } catch (e) {}
      close();
    }, false);
  } catch (e) {}

  try { window.addEventListener('pdx-issue-votes', function () { repaint(); }); } catch (e) {}

  window.PDXIssueFile = {
    ID: ID,
    ID_CHROME: ID_CHROME,
    ID_LEDGER: ID_LEDGER,
    ID_TITLE: ID_TITLE,
    ID_HEAD: ID_HEAD,
    open: open,
    focus: focus,
    close: close,
    repaint: repaint,
    // The letterhead's three controls, reached from the inline handlers in the
    // markup this module paints. Named on the module rather than as three new
    // lowercase globals, because one name for one door is the rule /i/ is built
    // on and the module's own name is already on the window.
    familyJump: familyJump,
    deskJump: deskJump,
    seeMeasures: seeMeasures,
    share: share,
    isOpen: function () { return !!_open; },
    key: function () { return _key; },
    // The chrome's markup, published for the same reason issue-scope.js publishes
    // cardHtml: the copy in it is part of the deliverable, and a test that can
    // only reach it through a real overlay is a test that does not read the copy.
    _chrome: chromeHtml,
    // The letterhead's markup, published for exactly the same reason: the copy in
    // it — the scope sentence, the inventory line, the busy gate's words — is the
    // deliverable of this pass, and a test that can only reach it through a live
    // overlay is a test that does not read the copy.
    _head: headHtml,
    // The census this letterhead printed from, so a test can compare the integers
    // on the line against the desk's own published read without parsing prose.
    _census: census,
    _proc: procHtml,
    // The bar's treatment on its own, so a test can compare the token this file
    // would print against PDXIssueColors.styleFor(key) without parsing markup.
    _skin: function (key) {
      var C = colors();
      if (!C || !key) return { on: false, style: '', attr: '' };
      try { return C.skin(key, familyLookup()) || { on: false, style: '', attr: '' }; }
      catch (e) { return { on: false, style: '', attr: '' }; }
    },
    _relock: lock,
    _ledger: ledger,
    _node: function () { return el(ID); }
  };
})();
