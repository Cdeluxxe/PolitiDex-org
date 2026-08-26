/* ═══════════════════════════════════════════════════════════════════════════
   record-card.js — THE RECORD CARD  ·  window.PDXRecordCard
   ───────────────────────────────────────────────────────────────────────────
   Phase 5. One shareable object, with fixed honesty, for one person — or one
   person on one issue. It is the thing that travels: a link in a group chat, an
   image in a quote-post, a paste into an email. Everywhere else on this site a
   reader can click a chip to see what a word rests on. Off-site they cannot, so
   the card has to arrive already saying what it does and does not know.

   WHY A NEW MODULE AND NOT A SIXTH CARD FEED. There are already three card
   feeds (say-vs-do, record-direction, word-record) and a whole-person canvas
   card, each with its own guards. This adds a fourth of none of that. It is a
   READER over them:

     · the say-vs-do / record-direction feeds, through their PUBLIC gates only
       (publicCardsFor / publicRecordDirectionCardsFor — never cardsFor), so
       every guard in receipt-cards.js applies to what lands here unchanged;
     · PDXConsistency.recordDirection.slot() and .formalPatternIndex.shape()
       for the pattern read, in the tier vocabulary the profile rows already
       print — thin / split / one way, no new grade and no new word;
     · PDXInventory + PDXGaps for coverage, which are counts and a door, never
       a ratio and never a quality read;
     · PDXWordAction.read().publishable as the ONE gate on the ONE percentage.

   THE FIVE BLOCKS, in this order, always:

     1. STATED POSITION — printed only where independent word exists. A stance
        card written FROM the record is not a stated position (that is the
        circularity rule word-action.js already enforces via isIndependentWord,
        and this reads its verdict rather than re-deciding it). No word on file
        → the block is absent. It is never filled in from anywhere.
     2. FORMAL ACTS / PATTERN — the cited act, or the counts by direction.
     3. WHAT THE RECORD POINTS TO — the existing tier language. thin / ran both
        ways / one way. Never a letter, never a band, never a new adjective.
     4. COVERAGE · WHAT IS MISSING — counts of what is held plus the open-gaps
        door. Not a completeness percentage, because a denominator we invented
        is worse than no denominator.
     5. SOURCES — every citation the blocks above rest on.

   WHAT THE CARD MAY NEVER DO — enforced in code (scrub / audit), not in a
   comment:
     · No percentage anywhere except the Direction Match row, and that row is
       absent unless PDXWordAction says publishable. The floors are not lowered
       to make a card look full; a thin file gets a thin card that says so.
     · No party name, no party framing (the receipt-cards party tripwire is
       reused where it is loaded).
     · No completeness claim. The anti-completeness line ships on every card,
       in the image caption, in the text and in the markup.
     · No composite, no letter grade, no cross-person comparison, nothing
       ranked. Two record cards side by side are two records, not a scoreboard.

   ADDRESSING — why the URL is what it is. The share must land on the real
   person file, and Phase 1 made /p/<pid> a 200-rewrite with an OG preview. So:

     person card  → https://…/p/<pid>
     issue card   → https://…/p/<pid>?record=<pid>~<issueKey>

   share-target.ts resolves /p/<pid> BEFORE ?record=, so the crawler preview and
   the canonical URL are the person file either way — one preview, no second
   OG surface to keep honest. On arrival share-links.js turns the query back into
   #record=… on whatever path it is already on, so PDXPerson.bootAdopt opens the
   file and PDXReceiptCards.handleHash opens that issue's record view. Same
   content in-app and from a shared URL, and no edge function had to learn a new
   shape.

   NEVER FEEDS. Nothing here writes anywhere. It is a read and a share.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXRecordCard) return; // idempotent

  var _ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return _ESC[c]; }); }

  function RC() { return window.PDXReceiptCards || null; }
  function CS() { return window.PDXConsistency || null; }
  function WA() { return window.PDXWordAction || null; }
  function INV() { return window.PDXInventory || null; }
  function GAPS() { return window.PDXGaps || null; }
  function SL() { return window.PDXShareLinks || null; }
  function PC() { return window.PDXProfileCard || null; }

  // ── The locked copy ────────────────────────────────────────────────────────
  // Every sentence the card can say about a shortfall is written once, here, so
  // "still being built" cannot become "no record" in one surface and "nothing
  // found" in another. Two shortfalls, said in the two ways the brief names
  // them: the record is still being built, or there is not enough tested word.
  var BUILDING = {
    person: 'Record still being built — PolitiDex has not documented enough of this ' +
            'person’s formal record to say what it points to yet.',
    issue: 'Record still being built — PolitiDex has not documented enough on this ' +
           'issue to say what the record points to yet.',
    word: 'Not enough tested word on file to publish a Direction Match.',
    stated: 'No stated position of their own on file here yet.',
    formal: 'No formal act on file here yet.',
    sources: 'No citation on file here yet.',
    // 23 of the 502 documented positions in the shipped corpus are real
    // independent word with no citation link on file. Off-site a reader cannot
    // click through to see what a sentence rests on, so the card says which of
    // the two it is handing them rather than letting an unlinked quote look
    // linked — and rather than dropping their stated position, which would make
    // the card imply they have never said anything on the issue.
    statedSource: 'Documented by PolitiDex · no citation link on file for this statement yet.'
  };
  // Ships on every card, every surface. The card is what we hold; it is not a
  // claim about what exists.
  var NOTE = 'This card is what PolitiDex holds on the record, not everything that exists. ' +
             'Coverage is stated in counts, never as a completeness figure.';
  var BLOCKS = ['stated', 'formal', 'points', 'coverage', 'sources'];
  var LABELS = {
    stated: 'Stated position',
    formal: 'Formal acts',
    points: 'What the record points to',
    coverage: 'Coverage · what is missing',
    sources: 'Sources'
  };
  // Word-action item kinds that ARE a stated position of their own. Anything
  // else — a card narrated from the record, a signature-issue tag with no text —
  // is not word, and block 1 stays empty rather than borrowing one.
  var INDEPENDENT_KINDS = { position: 1, 'pledge-stated': 1 };

  // The two tripwires, run over composed copy rather than trusted to the
  // upstreams. PCT_RE is allowed through exactly once (the Direction Match row);
  // PARTY_RE is never allowed at all. receipt-cards.js already owns a party
  // FRAMING regex — reused when it is loaded, so there is one list of phrases,
  // and this one adds the party NAMES it does not need to carry.
  var PCT_RE = /\d\s*%/;
  var PARTY_RE = /\b(?:republicans?|democrats?|democratic|gop|party[- ]lines?|partisan)\b/i;
  function partyFramed(s) {
    if (PARTY_RE.test(s)) return true;
    try {
      var g = RC() && RC().guards;
      if (g && g.partyFrameRe && g.partyFrameRe.test(s)) return true;
    } catch (e) {}
    return false;
  }
  // A grade word inside a NEGATION is the product's own disclaimer, not a grade:
  // the record-direction note ships the sentence "this is what the record itself
  // did — not a score" on every thin lane, and a tripwire that fired on it would
  // be reading the denial as the claim. So the negated forms are removed before
  // the test, which leaves an affirmative "Ranked 3rd" catchable and the
  // disclaimer alone.
  // Inflections matter here: "Graded B on the record" and "Scored 4th of 12" are
  // the same claim as "grade" and "score", and a stem list that missed them would
  // have let the two most natural phrasings through.
  var GRADE_WORDS = '(?:grade[ds]?|grading|scores?|scored|scoring|ranks?|ranked|ranking|leaderboard)';
  var GRADE_RE = new RegExp('\\b' + GRADE_WORDS + '\\b', 'i');
  var NOT_GRADE_RE = new RegExp(
    '\\b(?:not|never|no)\\b\\s+(?:a|an|the)?\\s*(?:new\\s+)?' + GRADE_WORDS + '\\b', 'gi');
  function gradeClaim(s) { return GRADE_RE.test(String(s).replace(NOT_GRADE_RE, ' ')); }

  // A line that breaks a rule is DROPPED, not softened. The card is allowed to
  // be shorter than we hoped; it is not allowed to say something it must not.
  function scrub(lines) {
    var out = [];
    (lines || []).forEach(function (l) {
      var s = String(l == null ? '' : l).trim();
      if (!s) return;
      if (PCT_RE.test(s)) return;
      if (partyFramed(s)) return;
      out.push(s);
    });
    return out;
  }
  // The same drop, for lines that are QUOTATIONS rather than sentences this
  // module wrote: a measure title, an act line composed and already guarded by
  // receipt-cards.js. Bills really are named "Bipartisan Safer Communities Act",
  // and a party tripwire run over their titles would silently delete a formal act
  // from the card — a worse dishonesty than the phrase it was guarding against.
  // receipt-cards.js draws the same line for the same reason ("a measure title, a
  // curated rationale and a stated position are quoted, not written here"). A
  // percentage has no such excuse: no bill title carries one, so that half stays.
  function scrubQuoted(lines) {
    var out = [];
    (lines || []).forEach(function (l) {
      var s = String(l == null ? '' : l).trim();
      if (!s || PCT_RE.test(s)) return;
      out.push(s);
    });
    return out;
  }

  // ── Identity ───────────────────────────────────────────────────────────────
  function profileOf(pid) {
    try { return (window.CMP_DATA && window.CMP_DATA[pid]) || (window.PROFILES && window.PROFILES[pid]) || null; }
    catch (e) { return null; }
  }
  function nameOf(pid, p) {
    var n = p && (p.name || p.fullName || p.displayName);
    if (n) return String(n);
    return String(pid || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function officeOf(p) { return String((p && (p.office || p.title || p.role)) || '').trim(); }
  function issueLabel(k) {
    if (!k) return '';
    try { if (typeof window._issueLabel === 'function') return window._issueLabel(k) || k; } catch (e) {}
    return String(k);
  }
  function dateText(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    try { return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return String(iso).slice(0, 10); }
  }

  // ── The URL contract ───────────────────────────────────────────────────────
  // One builder, used by the link, the copy path and the image payload, so the
  // three cannot disagree about where the card points. See the header note.
  function url(pid, issueKey) {
    var L = SL();
    if (L && typeof L.personRecord === 'function') return L.personRecord(pid, issueKey);
    // share-links.js not loaded (or an older copy): build the same address by
    // hand rather than fall back to a different one.
    var origin = '';
    try { origin = location.origin || ''; } catch (e) { origin = ''; }
    if (!pid) return origin + '/';
    var base = origin + '/p/' + encodeURIComponent(String(pid));
    return issueKey ? base + '?record=' + encodeURIComponent(String(pid) + '~' + String(issueKey)) : base;
  }

  // ── Block 1 · stated position ──────────────────────────────────────────────
  function statedOf(pid, p, issueKey) {
    if (!issueKey) return null;          // a person card names no single position
    var wa = WA();
    if (!wa || typeof wa.issueRead !== 'function') return null;
    var it = null;
    try { it = wa.issueRead(pid, p, issueKey); } catch (e) { it = null; }
    if (!it || !it.text) return null;
    if (!INDEPENDENT_KINDS[it.kind]) return null;   // record-derived: not their word
    var src = (it.sources && it.sources[0]) || null;
    var source = null;
    if (src && src.url) source = { url: String(src.url), label: String(src.label || 'Source') };
    else if (src && src.label) source = { url: '', label: String(src.label) };
    return {
      text: String(it.text),
      stance: String(it.stance || ''),
      source: source,
      // Present exactly when there is nothing to cite. Printed on every surface,
      // and audit() requires it — a quote with neither a citation nor this line
      // is an assertion in their name.
      missing: source ? '' : BUILDING.statedSource
    };
  }

  // ── Blocks 2 + 5 · the strongest PUBLIC card on file, and its citations ────
  // Public gates only. A card blocked by any guard in receipt-cards.js is not a
  // card here either, and the block goes empty rather than reaching past it.
  function publicCard(pid, issueKey) {
    var rc = RC();
    if (!rc) return null;
    var list = null;
    if (typeof rc.publicCardsFor === 'function') {
      try { list = rc.publicCardsFor(pid, issueKey ? { issueKey: issueKey } : {}); } catch (e) { list = null; }
      if (list && list.length) return list[0];
    }
    if (typeof rc.publicRecordDirectionCardsFor === 'function') {
      try { list = rc.publicRecordDirectionCardsFor(pid, issueKey ? { issueKey: issueKey } : {}); }
      catch (e) { list = null; }
      if (list && list.length) return list[0];
    }
    return null;
  }
  function formalOf(pid, card, issueKey) {
    var quoted = [], lines = [];
    if (card) {
      if (card.headline) quoted.push(String(card.headline));
      if (card.didLine) quoted.push(String(card.didLine));
      if (card.instrument && card.instrument.label) quoted.push('Instrument: ' + card.instrument.label);
      if (card.date) quoted.push('Dated ' + dateText(card.date));
    }
    if (!issueKey) {
      // The whole-person pattern, in counts. shape() is the four-fact summary of
      // the formal-pattern index — issues read, acts judged, and the three tier
      // buckets. Counts and slices; there is no percentage in it by design.
      var sh = null;
      try {
        var cs = CS();
        sh = (cs && cs.formalPatternIndex && typeof cs.formalPatternIndex.shape === 'function')
          ? cs.formalPatternIndex.shape(pid) : null;
      } catch (e) { sh = null; }
      if (sh && (sh.judged || sh.read)) {
        lines.push(sh.judged + ' judged formal act' + (sh.judged === 1 ? '' : 's') +
          ' across ' + sh.read + ' issue' + (sh.read === 1 ? '' : 's') + ' on file');
        var buckets = [];
        if (sh.strongN) buckets.push(sh.strongN + ' where the record points one way');
        if (sh.splitN) buckets.push(sh.splitN + ' where it ran both ways');
        if (sh.thinN) buckets.push(sh.thinN + ' too thin to characterise');
        if (buckets.length) lines.push(buckets.join(' · '));
      }
    }
    var q = scrubQuoted(quoted);
    lines = q.concat(scrub(lines));
    // `quoted` is what audit() needs in order to apply the same exemption formalOf
    // just applied. Without it the two halves of this module disagree about
    // whether a bill's legal name counts as party framing.
    return lines.length ? { lines: lines, quoted: q, card: card || null } : null;
  }
  function sourcesOf(card, stated) {
    var out = [], seen = {};
    function add(label, u) {
      u = String(u || '');
      if (!u || u.slice(0, 4) !== 'http' || seen[u]) return;
      seen[u] = 1;
      out.push({ label: String(label || 'Source'), url: u });
    }
    if (stated && stated.source && stated.source.url) {
      add(stated.source.label + ' (stated position)', stated.source.url);
    }
    if (card) {
      if (card.source && card.source.url) add(card.source.label || 'Source', card.source.url);
      if (card.verifyUrl) add('Verify', card.verifyUrl);
      if (card.sides) {
        ['with', 'against'].forEach(function (k) {
          var f = card.sides[k];
          if (f && f.verify) add(k === 'with' ? 'Advanced it — example' : 'Cut against it — example', f.verify);
        });
      }
    }
    try {
      var m = RC() && RC().METHOD_URL;
      if (m) add('How this is judged', m);
    } catch (e) {}
    return out.slice(0, 5);
  }

  // ── Block 3 · what the record points to ────────────────────────────────────
  // The issue read comes straight off PDXConsistency.recordDirection.slot(): the
  // same shape the ballot cards and profile rows print, with its own three
  // states (speaks / thin / none) and its own disclosure line. Nothing is
  // re-derived here, so this card cannot reach a conclusion the profile does not.
  function pointsOf(pid, p, issueKey, card) {
    var cs = CS();
    if (issueKey) {
      var slot = null;
      try {
        slot = (cs && cs.recordDirection && typeof cs.recordDirection.slot === 'function')
          ? cs.recordDirection.slot(pid, issueKey) : null;
      } catch (e) { slot = null; }
      if (slot) {
        return {
          state: slot.state, tier: slot.state,
          lines: scrub([slot.text]), note: String(slot.note || ''),
          building: slot.state === 'none'
        };
      }
      // No slot (an exec-lane issue, nothing warm). A record-direction card, if
      // one passed the public gate, still states its own counts.
      if (card && card.recordDirection) {
        var rd = card.recordDirection;
        return {
          state: rd.split ? 'split' : 'speaks', tier: rd.split ? 'split' : 'speaks',
          lines: scrub([card.recordLabel ? String(card.recordLabel) : '', String(card.headline || '')]),
          note: String(card.recordNote || ''), building: false
        };
      }
      return { state: 'none', tier: 'none', lines: [BUILDING.issue], note: '', building: true };
    }
    // Whole person: Word vs Action's own verdict, in words. The percentage is a
    // separate row with a separate gate — see directionMatchOf().
    var wa = WA();
    var read = null;
    try { read = (wa && typeof wa.read === 'function') ? wa.read(pid, p) : null; } catch (e) { read = null; }
    if (!read) return { state: 'none', tier: 'none', lines: [BUILDING.person], note: '', building: true };
    var tested = (read.tested && read.tested.length) || 0;
    var warming = !!(read.coverage && read.coverage.warming);
    var lines = [];
    // A card is a thing that travels and then sits still. "Loading the record…"
    // is word-action's honest label for a page that is about to fill in, but on a
    // shared image or a paste it becomes a promise nobody will see kept — and for
    // a local official with no roll-call record to load, it never resolves at all.
    // So the transient state prints as the shortfall it actually is.
    if (warming) lines.push(BUILDING.person);
    else if (read.verdict && read.verdict.label) lines.push('⚖️ Word vs Action: ' + read.verdict.label);
    lines.push(tested
      ? tested + ' stated position' + (tested === 1 ? '' : 's') + ' tested against a formal act'
      : 'Nothing they have stated has been tested by a formal act yet');
    if (!read.publishable) lines.push(BUILDING.word);
    lines = scrub(lines);
    return {
      state: read.publishable ? 'speaks' : (warming || !tested ? 'none' : 'thin'),
      tier: read.publishable ? 'speaks' : (warming || !tested ? 'none' : 'thin'),
      lines: lines, note: '', building: !tested, warming: warming
    };
  }

  // ── The one percentage, and its one gate ───────────────────────────────────
  // Direction Match appears on a PERSON card and only when word-action.js says
  // the read is publishable. An issue card never carries it: there is no
  // per-issue percentage in this product, and inventing one to fill a row is
  // exactly the drift this module exists to refuse. The floors are read, never
  // lowered.
  function directionMatchOf(pid, p, issueKey) {
    if (issueKey) return null;
    var wa = WA();
    if (!wa || typeof wa.read !== 'function') return null;
    var read = null;
    try { read = wa.read(pid, p); } catch (e) { read = null; }
    if (!read || read.publishable !== true) return null;
    if (typeof read.pct !== 'number' || !isFinite(read.pct)) return null;
    return {
      pct: read.pct,
      label: (read.verdict && read.verdict.label) || '',
      text: 'Direction Match ' + read.pct + '% — ' +
            ((read.verdict && read.verdict.label) || 'on tested statements')
    };
  }

  // ── Block 4 · coverage ─────────────────────────────────────────────────────
  function coverageOf(pid, p) {
    var lines = [];
    var inv = INV();
    if (inv && typeof inv.text === 'function') {
      var t = '';
      try { t = inv.text(pid, p) || ''; } catch (e) { t = ''; }
      if (t) lines.push(t);
    }
    var gapsUrl = '', gaps = 0;
    var g = GAPS();
    if (g) {
      try { gaps = (typeof g.count === 'function') ? (g.count(pid, p) || 0) : 0; } catch (e) { gaps = 0; }
      try { gapsUrl = (typeof g.citeUrl === 'function') ? (g.citeUrl(pid) || '') : ''; } catch (e) { gapsUrl = ''; }
    }
    if (!lines.length) lines.push('Nothing documented on file here yet.');
    lines = scrub(lines);
    // PDXInventory.text() already states the open-gap count when there is one, so
    // repeating it under the same heading reads as two different facts about the
    // same number. When it has been said, all that is left to add is the door.
    var said = lines.join(' ').indexOf('open gap') >= 0;
    return { lines: lines, gaps: gaps, gapsUrl: gapsUrl, gapsSaid: said };
  }

  // ── read() · the whole model ────────────────────────────────────────────────
  function read(pid, opts) {
    pid = String(pid || '');
    if (!pid) return null;
    var o = opts || {};
    var issueKey = String(o.issueKey || '');
    var p = o.profile || profileOf(pid);
    var card = publicCard(pid, issueKey);
    var stated = statedOf(pid, p, issueKey);
    var formal = formalOf(pid, card, issueKey);
    var points = pointsOf(pid, p, issueKey, card);
    var coverage = coverageOf(pid, p);
    var sources = sourcesOf(card, stated);
    var dm = directionMatchOf(pid, p, issueKey);
    var m = {
      pid: pid, name: nameOf(pid, p), office: officeOf(p),
      issueKey: issueKey, issueLabel: issueLabel(issueKey),
      scope: issueKey ? 'issue' : 'person',
      stated: stated, formal: formal, points: points, coverage: coverage,
      sources: sources, directionMatch: dm,
      // The two honesty flags a host surface may read. `building` is the
      // below-floor case and it is stated on the card, never hidden by it.
      building: !!(points && points.building) && !formal,
      complete: false,
      note: NOTE,
      tier: (card && RC() && typeof RC().publicTier === 'function') ? (RC().publicTier(card) || 'none') : 'none',
      url: url(pid, issueKey)
    };
    m.title = m.name + (issueKey ? ' — ' + m.issueLabel : '') + ' · PolitiDex record card';
    return m;
  }

  // ── text() · the paste / copy / caption form ────────────────────────────────
  function text(pidOrModel, opts) {
    var m = (pidOrModel && pidOrModel.pid && pidOrModel.blocksReady !== false && pidOrModel.url)
      ? pidOrModel : read(pidOrModel, opts);
    if (!m) return '';
    var L = [];
    L.push(m.title);
    if (m.office) L.push(m.office);
    L.push('');
    if (m.stated) {
      L.push(LABELS.stated.toUpperCase());
      L.push('“' + m.stated.text + '”');
      if (m.stated.source && m.stated.source.url) L.push('Source: ' + m.stated.source.url);
      else if (m.stated.source) L.push('Source: ' + m.stated.source.label);
      else L.push(m.stated.missing);
      L.push('');
    }
    if (m.formal) {
      L.push(LABELS.formal.toUpperCase());
      m.formal.lines.forEach(function (l) { L.push(l); });
      L.push('');
    } else {
      L.push(LABELS.formal.toUpperCase());
      L.push(BUILDING.formal);
      L.push('');
    }
    if (m.points) {
      L.push(LABELS.points.toUpperCase());
      m.points.lines.forEach(function (l) { L.push(l); });
      if (m.points.note) L.push(m.points.note);
      L.push('');
    }
    if (m.directionMatch) { L.push(m.directionMatch.text); L.push(''); }
    L.push(LABELS.coverage.toUpperCase());
    m.coverage.lines.forEach(function (l) { L.push(l); });
    if (m.coverage.gaps && !m.coverage.gapsSaid) {
      L.push(m.coverage.gaps + ' open gap' + (m.coverage.gaps === 1 ? '' : 's') +
        (m.coverage.gapsUrl ? ': ' + m.coverage.gapsUrl : ''));
    } else if (m.coverage.gaps && m.coverage.gapsUrl) {
      L.push('What the record can’t test yet: ' + m.coverage.gapsUrl);
    }
    L.push('');
    L.push(LABELS.sources.toUpperCase());
    if (m.sources.length) {
      m.sources.forEach(function (s) { L.push('• ' + s.label + ' — ' + s.url); });
    } else {
      L.push(BUILDING.sources);
    }
    L.push('');
    L.push(m.note);
    L.push(m.url);
    return L.join('\n');
  }

  // ── html() · the same card, in-app ─────────────────────────────────────────
  // Same blocks, same order, same sentences as text(). A reader who opens the
  // link must meet what the paste promised.
  function blockHtml(kicker, body, cls) {
    if (!body) return '';
    return '<div class="pdxrec-b' + (cls ? ' ' + cls : '') + '">' +
      '<div class="pdxrec-k">' + esc(kicker) + '</div>' + body + '</div>';
  }
  function html(pidOrModel, opts) {
    var m = (pidOrModel && pidOrModel.pid && pidOrModel.url) ? pidOrModel : read(pidOrModel, opts);
    if (!m) return '';
    var o = opts || {};
    var parts = [];
    parts.push('<div class="pdxrec-hd">' +
      '<a class="pdxrec-name" href="' + esc(pathOf(m)) + '">' + esc(m.name) + '</a>' +
      (m.office ? '<span class="pdxrec-office">' + esc(m.office) + '</span>' : '') +
      (m.issueLabel ? '<span class="pdxrec-issue">' + esc(m.issueLabel) + '</span>' : '') +
    '</div>');
    if (m.stated) {
      parts.push(blockHtml(LABELS.stated,
        '<blockquote class="pdxrec-said">' + esc(m.stated.text) + '</blockquote>' +
        ((m.stated.source && m.stated.source.url)
          ? '<a class="pdxrec-src" href="' + esc(m.stated.source.url) + '" target="_blank" rel="noopener noreferrer">' +
            esc(m.stated.source.label) + ' ↗</a>'
          : (m.stated.source
              ? '<span class="pdxrec-src">' + esc(m.stated.source.label) + '</span>'
              : '<p class="pdxrec-thin">' + esc(m.stated.missing) + '</p>'))));
    }
    parts.push(blockHtml(LABELS.formal, m.formal
      ? '<ul class="pdxrec-lines">' + m.formal.lines.map(function (l) {
          return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'
      : '<p class="pdxrec-thin">' + esc(BUILDING.formal) + '</p>'));
    if (m.points) {
      parts.push(blockHtml(LABELS.points,
        '<ul class="pdxrec-lines">' + m.points.lines.map(function (l) {
          return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
        (m.points.note ? '<p class="pdxrec-note">' + esc(m.points.note) + '</p>' : ''),
        'is-' + esc(m.points.state)));
    }
    if (m.directionMatch) {
      parts.push('<p class="pdxrec-dm">' + esc(m.directionMatch.text) + '</p>');
    }
    parts.push(blockHtml(LABELS.coverage,
      '<ul class="pdxrec-lines">' + m.coverage.lines.map(function (l) {
        return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
      (m.coverage.gaps
        ? '<p class="pdxrec-gaps">' +
          (m.coverage.gapsSaid ? '' : esc(m.coverage.gaps + ' open gap' + (m.coverage.gaps === 1 ? '' : 's'))) +
          (m.coverage.gapsUrl ? ' <a href="' + esc(m.coverage.gapsUrl) + '">what the record can’t test yet →</a>' : '') +
          '</p>' : '')));
    parts.push(blockHtml(LABELS.sources, m.sources.length
      ? '<ul class="pdxrec-srcs">' + m.sources.map(function (s) {
          return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
            esc(s.label) + ' ↗</a></li>'; }).join('') + '</ul>'
      : '<p class="pdxrec-thin">' + esc(BUILDING.sources) + '</p>'));
    parts.push('<p class="pdxrec-wall">' + esc(m.note) + '</p>');
    if (o.share !== false) parts.push(buttonHtml({ pid: m.pid, issueKey: m.issueKey, block: true }));
    return '<div class="pdxrec" data-pdxrec="' + esc(m.pid) + '"' +
      (m.issueKey ? ' data-pdxrec-issue="' + esc(m.issueKey) + '"' : '') +
      ' data-pdxrec-scope="' + esc(m.scope) + '">' + parts.join('') + '</div>';
  }
  // The in-app href: the same address as the share URL, path-only, so an in-app
  // click routes through the SPA instead of reloading the document.
  // The in-app href: the same address as url(), minus the origin, so a click
  // routes through the SPA instead of reloading. Done with string slicing rather
  // than `new URL()` — this module builds the string itself two functions up, so
  // parsing it back through a global that any given host may not define is a
  // dependency with nothing to buy. Where URL was absent this silently fell
  // through to the origin-less fallback and an issue card lost its ?record=.
  function pathOf(m) {
    var u = String(m && m.url || '');
    var i = u.indexOf('://');
    if (i > 0) { var j = u.indexOf('/', i + 3); return j > 0 ? u.slice(j) : '/'; }
    if (u.charAt(0) === '/') return u;
    return '/p/' + encodeURIComponent(String(m && m.pid || ''));
  }

  // ── audit() · the honesty check, as data ───────────────────────────────────
  // Returns [] for a card that may ship. Exposed so the harness can assert what
  // the tripwires CATCH — hand it a forged model and it names the violation —
  // rather than only that a real card passed.
  // WHAT IS AUDITED, AND WHAT IS DELIBERATELY NOT. The tripwires run over the
  // sentences this card COMPOSED — the act lines, the pattern lines, the coverage
  // lines, the disclosure note, the title. Two things on the card are quoted, and
  // auditing a quotation would make the card lie in the other direction:
  //
  //   · the stated position, which is their own sentence with a citation under it.
  //     People say "Democrats", "bipartisan" and "ranking member"; a card that
  //     dropped or flagged their word for containing a party name would be
  //     editing the person to protect our framing. The rule this module enforces
  //     is that WE do not frame a record as party behaviour — not that they never
  //     mentioned a party.
  //   · the source labels, which are the proper names of institutions. "House
  //     Armed Services Committee (Democrats)" is what that committee is called,
  //     and renaming a citation is worse than printing one.
  //
  // Both exemptions are the line receipt-cards.js already draws, in its words: a
  // measure title, a curated rationale and a stated position are quoted, not
  // written here. Verified against the shipped corpus: 404 real cards, and every
  // hit these two exemptions remove was a quotation or a disclaimer.
  function audit(m) {
    var bad = [];
    if (!m) return ['no card'];
    // Each entry is [line, quoted]. A quoted line is a measure title or an act
    // line receipt-cards.js already composed: the party wire is not run over it,
    // for the reason scrubQuoted() spells out. Every other wire still is.
    var body = [];
    ['formal', 'points', 'coverage'].forEach(function (k) {
      var b = m[k];
      if (!b) return;
      var q = {};
      (b.quoted || []).forEach(function (l) { q[String(l)] = 1; });
      if (b.lines) b.lines.forEach(function (l) { body.push([l, !!q[String(l)]]); });
      if (b.note) body.push([b.note, false]);
    });
    body.push([m.title || '', false]);
    body.forEach(function (row) {
      var l = row[0];
      if (PCT_RE.test(l)) bad.push('a percentage outside the Direction Match row: ' + l);
      if (!row[1] && partyFramed(l)) bad.push('party framing on the card: ' + l);
      if (/\b(?:complete|full|every) record\b/i.test(l)) bad.push('a completeness claim: ' + l);
      if (gradeClaim(l)) bad.push('a grade or ranking: ' + l);
    });
    // The quotation still has to BE a quotation: word on the card with no source
    // under it is an assertion in their name, and the card must say so.
    if (m.stated && !m.stated.source && m.stated.missing !== BUILDING.statedSource) {
      bad.push('a stated position with neither a citation nor the line saying there is none');
    }
    if (m.directionMatch && m.scope !== 'person') bad.push('Direction Match on an issue card');
    if (m.complete !== false) bad.push('the card claims completeness');
    if (!m.note) bad.push('the card ships without the coverage wall');
    if (!/^https?:\/\/[^/]+\/p\//.test(String(m.url || ''))) bad.push('the share url is not a person file: ' + m.url);
    return bad;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE SHARE AFFORDANCE
  // ──────────────────────────────────────────────────────────────────────────
  // Unlike the receipt-card button this one is NOT fail-closed-to-invisible,
  // and the difference is deliberate. A receipt-card share promises a verdict
  // image: no image, no button. A record card promises the record AS IT STANDS,
  // and "still being built" is a true thing to hand someone. So the control is
  // always live; what degrades is the artifact:
  //
  //   image  → only through an already-guarded pipeline (say-vs-do canvas for an
  //            issue card, PDXProfileCard for a person card). Never a canvas of
  //            our own, so no guard is re-implemented here.
  //   link   → always available, always /p/<pid>.
  //   text   → the five blocks, honest about every shortfall.
  //
  // The payload URL is this module's URL in every branch, including when the
  // image comes from another module's canvas. That is what makes a shared card
  // open the person file rather than a query-string view of it.
  // ══════════════════════════════════════════════════════════════════════════
  function buttonHtml(opts) {
    opts = opts || {};
    var pid = String(opts.pid || '');
    if (!pid) return '';
    var iss = String(opts.issueKey || '');
    var lbl = opts.text || 'Share this record card';
    var aria = 'Share ' + nameOf(pid, profileOf(pid)) + '’s record card' +
      (iss ? ' on ' + issueLabel(iss) : '') +
      ' — the stated position where there is one, the formal acts, what the record points to, ' +
      'what is still missing, and the sources. Opens their person file.';
    return '<button type="button" class="pdxrec-share' + (opts.block ? ' pdxrec-share-block' : '') +
      (opts.cls ? ' ' + esc(opts.cls) : '') + '"' +
      ' data-pdxrec-share="' + esc(pid) + '"' +
      (iss ? ' data-pdxrec-share-issue="' + esc(iss) + '"' : '') +
      (opts.stopKeys ? ' onkeydown="event.stopPropagation()"' : '') +
      ' title="' + esc(aria) + '" aria-label="' + esc(aria) + '">' +
      '<span class="pdxrec-share-ico" aria-hidden="true">🗂️</span>' +
      '<span class="pdxrec-share-lbl">' + esc(lbl) + '</span></button>';
  }

  function toast(msg) {
    try { if (typeof window._showToast === 'function') { window._showToast(msg); return true; } } catch (e) {}
    return false;
  }
  function busy(btn, on) {
    if (!btn || !btn.classList) return;
    if (on) { btn.classList.add('pdxrec-busy'); btn.setAttribute('aria-busy', 'true'); }
    else { btn.classList.remove('pdxrec-busy'); btn.removeAttribute('aria-busy'); }
  }
  function copy(pidOrModel, opts) {
    var body = text(pidOrModel, opts);
    if (!body) return Promise.resolve(false);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(body).then(function () {
          toast('Record card copied — the link goes to their person file'); return true;
        }, function () { return false; });
      }
    } catch (e) {}
    return Promise.resolve(false);
  }

  // The image half. One artifact source per scope, both already guarded, and a
  // byte floor on what comes back — a 0-byte blob shared as a card is a card
  // that says nothing at all.
  function artifact(m) {
    var rc = RC(), L = SL();
    if (m.scope === 'issue') {
      var card = (m.formal && m.formal.card) || null;
      if (!card || !rc || typeof rc.renderImage !== 'function') return Promise.resolve(null);
      return rc.renderImage(card).then(function (blob) {
        if (L && typeof L.blobOk === 'function' && !L.blobOk(blob)) return null;
        try { return new File([blob], 'politidex-record-card.png', { type: 'image/png' }); }
        catch (e) { return null; }
      }, function () { return null; });
    }
    var pc = PC();
    if (!pc || typeof pc.renderImage !== 'function') return Promise.resolve(null);
    return Promise.resolve(pc.renderImage(m.pid)).then(function (blob) {
      if (!blob) return null;
      if (L && typeof L.blobOk === 'function' && !L.blobOk(blob)) return null;
      try { return new File([blob], 'politidex-record-card.png', { type: 'image/png' }); }
      catch (e) { return null; }
    }, function () { return null; });
  }

  var _sharing = false;
  function share(pid, btn, opts) {
    var o = opts || {};
    var iss = String(o.issueKey || (btn && btn.getAttribute && btn.getAttribute('data-pdxrec-share-issue')) || '');
    var m = read(pid, { issueKey: iss });
    if (!m) return Promise.resolve(null);
    if (_sharing) return Promise.resolve(null);
    _sharing = true; busy(btn, true);
    var done = function (v) { _sharing = false; busy(btn, false); return v; };
    var body = text(m);
    var L = SL();
    // Warm the record feeds first where they can be warmed, so a first-tap share
    // is the same card a second-tap share would have been.
    var warm = Promise.resolve(null);
    try {
      var rc = RC();
      if (rc && typeof rc.warm === 'function') warm = Promise.resolve(rc.warm(pid)).catch(function () { return null; });
    } catch (e) {}
    return warm.then(function () {
      m = read(pid, { issueKey: iss }) || m;
      body = text(m);
      return artifact(m);
    }).then(function (file) {
      var payload = { title: m.title, text: body, url: m.url };
      if (file) payload.files = [file];
      if (L && typeof L.native === 'function') {
        return L.native(payload).then(function (res) {
          if (res && (res.ok || res.outcome === 'cancelled')) return res;
          // No native sheet (or it refused): the link and the honest text are
          // still the card. Copy is the last resort, never a silent no-op.
          return copy(m).then(function (okc) {
            if (!okc) toast('Record card link: ' + m.url);
            return { ok: !!okc, outcome: okc ? 'copied' : 'link' };
          });
        });
      }
      return copy(m).then(function (okc) {
        if (!okc) toast('Record card link: ' + m.url);
        return { ok: !!okc, outcome: okc ? 'copied' : 'link' };
      });
    }).catch(function () {
      toast('Could not build the record card on this device');
      return null;
    }).then(done, done);
  }

  var _bound = false;
  function bind() {
    if (_bound || !document.body) return;
    _bound = true;
    document.body.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('[data-pdxrec-share]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      share(b.getAttribute('data-pdxrec-share') || '', b, {
        issueKey: b.getAttribute('data-pdxrec-share-issue') || ''
      });
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  window.PDXRecordCard = {
    BLOCKS: BLOCKS,
    LABELS: LABELS,
    BUILDING: BUILDING,
    NOTE: NOTE,
    PCT_RE: PCT_RE,
    PARTY_RE: PARTY_RE,
    INDEPENDENT_KINDS: INDEPENDENT_KINDS,
    // Nothing in this module may ever feed these. Same declaration self-defection
    // makes, for the same reason: a share primitive is the easiest place for a
    // composite to sneak back in.
    // Named without spelling the retired symbol: scripts/test-accountability-
    // retired.mjs bans `accountabilityScore` from every shipped module, and a
    // list of things we refuse to build is not a reason to put the identifier
    // back in the bundle.
    NEVER_FEEDS: ['directionMatchInput', 'retiredCompositeRating', 'compositeGrade',
                  'financeIntoDirectionMatch', 'crossPersonRanking', 'leaderboard'],
    scored: false,
    ranked: false,
    read: read,
    text: text,
    html: html,
    url: url,
    audit: audit,
    scrub: scrub,
    buttonHtml: buttonHtml,
    share: share,
    copy: copy,
    _artifact: artifact,
    _pathOf: pathOf
  };
})();
