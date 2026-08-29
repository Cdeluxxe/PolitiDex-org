/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Bill detail panel (Phase 2)  ·  window.PDXBillDetail
   ────────────────────────────────────────────────────────────────────────────
   A rich, additive modal over one measure. Opens from a Legislation-tab bill card
   (PDXBills.open delegates here) and reads exactly the shape the Voting Record
   Function already returns from GET /api/voting-record/measure/:id — no new API.

   Sections (each degrades gracefully when its data is absent):
     • Header — number, title, status, chamber/congress, source, omnibus marker.
     • Every topic this act touches — EVERY component issue mapping, enumerated,
       whether a Yea advances or cuts against it (support_meaning), and the
       rationale. The core "what's bundled", and the whole of it: no truncation,
       no primary-first sort, no rank badge. An optional view filter can slice the
       same rows, and its default is and stays All topics.
     • Roll calls — each vote event with totals, and a per-member vote table. Each
       member row can expand to what their vote did on EVERY topic this act maps
       to, computed from the shared _measureComponentBreakdown engine (one vote →
       many per-issue effects), with the say-vs-do verdict added on the topics
       where a stated stance exists.
     • Sponsors / cosponsors — from vr_positions.
     • Key actions — a lightweight timeline synthesized from introducedAt + the
       roll calls + status (a real vr_measure_actions table is a Phase-3 add).
     • Related — Issue Spotlights (via PDXSpotlight.forIssueKey) and profile links.

   Reuses: _measureComponentBreakdown, _polPositionMap, _issueLabel, showProfile,
   _getPhotoUrl, PDXSpotlight, CMP_DATA/PROFILES. Nothing here mutates app state.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXBillDetail) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(s) { return esc(s); }
  function G(n) { try { return window[n]; } catch (e) { return null; } }

  var _current = null; // the bill currently shown (for follow + share)

  // The app's own label first; then the shipped issue map behind the ⓘ control,
  // which is the same table the issue faces read; and only then a key prettified
  // into words. A chip that says "Lgbtq Rights" is a key wearing a label's clothes.
  function issueLabel(k) {
    try { if (typeof window._issueLabel === 'function') { var l = window._issueLabel(k); if (l) return l; } } catch (e) {}
    try {
      var S = window.PDXIssueScope;
      var r = (S && typeof S.read === 'function') ? S.read(k) : null;
      if (r && r.label) return r.label;
    } catch (e2) {}
    return String(k || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function prof(id) {
    var d = G('CMP_DATA') || {}; if (d[id]) return d[id];
    var p = G('PROFILES') || {}; return p[id] || null;
  }
  function nameFor(id) { var d = prof(id); return (d && d.name) ? d.name : String(id); }
  function photoFor(id) { try { if (typeof window._getPhotoUrl === 'function') return window._getPhotoUrl(id) || ''; } catch (e) {} return ''; }
  function isLocal(id) { try { return !!(typeof window._pdxIsLocalToUser === 'function' && window._pdxIsLocalToUser(id)); } catch (e) { return false; } }

  var STATUS = {
    introduced: 'Introduced', passed_house: 'Passed House', passed_senate: 'Passed Senate',
    enacted: 'Enacted', failed: 'Failed', vetoed: 'Vetoed', pending: 'Pending'
  };
  function statusLabel(s) { return STATUS[s] || (s ? String(s).replace(/_/g, ' ') : ''); }
  // Exact match, and a state chamber is in the table. The chain this replaced
  // fell through to `(c || '')` for anything it did not name, so a Utah measure
  // printed the bare stored value — 'utah house', lowercase, mid-sentence. The
  // stored value is deliberately the jurisdiction (see the vr_* ingest), so every
  // surface that prints it owes the reader the display form.
  var CHAMBERS = {
    house: 'House', senate: 'Senate', joint: 'Joint', court: 'Court',
    executive: 'Executive', 'utah house': 'Utah House', 'utah senate': 'Utah Senate'
  };
  function chamberLabel(c) {
    if (!c) return '';
    var k = String(c).toLowerCase().trim();
    return CHAMBERS[k] ||
      String(c).replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }
  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return String(iso).slice(0, 10); }
  }

  // ── THE LETTERHEAD'S IDENTITY FACTS ─────────────────────────────────────────
  // A bill profile opens the way a person file opens: a short census a reader can
  // scan before deciding to read anything. Three of its identity slots were not on
  // this face at all, and each is the difference between naming A measure and
  // naming THIS one.
  //
  //   · THE SITTING. "H.B. 208" names a different bill in every Utah general
  //     session, so a number without its sitting is not an identity. A federal row
  //     carries `congress`; a state row carries none — the column is NULL by
  //     design — and its session code lives in external_ids.utahSession, which is
  //     the field the ingest's own uniqueness index keys on.
  //   · THE DATE. Introduced when, and where there is one, decided when. Both come
  //     off rows already in the payload. Nothing here dates a measure we hold no
  //     date for.
  //   · THE TEXT THAT WAS READ. A mapping rationale is a claim about a document,
  //     and external_ids.mappingTextUrl records WHICH document the curator read —
  //     an enrolled bill, a first substitute. Where it exists that is the honest
  //     link to put under the identity; where it does not, the measure's own source
  //     is; and where neither exists the letterhead says so rather than printing a
  //     label that goes nowhere.
  function extIds(m) {
    var x = m && m.externalIds;
    return (x && typeof x === 'object') ? x : {};
  }
  var UTAH_SITTING = {
    GS: 'General Session', VS: 'Veto Override Session',
    S1: '1st Special Session', S2: '2nd Special Session',
    S3: '3rd Special Session', S4: '4th Special Session', S5: '5th Special Session'
  };
  function sittingLabel(m) {
    var us = String(extIds(m).utahSession || '');
    if (us) {
      var p = us.match(/^(\d{4})([A-Za-z0-9]+)$/);
      return p ? (p[1] + ' ' + (UTAH_SITTING[p[2].toUpperCase()] || p[2])) : us;
    }
    return (m && m.congress) ? (m.congress + 'th Congress') : '';
  }
  // The sitting as an ADDRESS SEGMENT rather than as prose: "119", "2024GS", or ''.
  // One function so the hash, the share link and the resolver cannot disagree about
  // what identifies a bill.
  function sittingKey(m) {
    var us = String(extIds(m).utahSession || '').trim();
    if (us) return us;
    return (m && m.congress) ? String(m.congress) : '';
  }
  function sittingKeyOfCard(c) {
    if (!c) return '';
    var x = c.externalIds;
    var us = (x && typeof x === 'object' && x.utahSession) ? String(x.utahSession).trim() : '';
    if (us) return us;
    return (c.congress != null && c.congress !== '') ? String(c.congress) : '';
  }
  function sittingMatch(card, want) {
    if (!want) return true;
    return String(sittingKeyOfCard(card)).toUpperCase() === String(want).toUpperCase();
  }

  // The document a mapping was read from, named in the ingest's own vocabulary. An
  // unrecognised value is printed as itself rather than guessed at.
  var TEXT_KIND = {
    enrolled: 'Enrolled text', introduced: 'Introduced text', engrossed: 'Engrossed text',
    substitute_1: 'First substitute text', substitute_2: 'Second substitute text',
    substitute_3: 'Third substitute text', substitute_4: 'Fourth substitute text'
  };
  // Read through the same five-key vocabulary the API's measureIdent() whitelists,
  // in the order of how close each link sits to the document the mapping was made
  // against: the recorded mapping text first, then the bill's own page, then the
  // measure's source of record. Never the whole provenance bag.
  function officialText(m) {
    var x = extIds(m);
    var u = x.mappingTextUrl ? String(x.mappingTextUrl) : '';
    if (u) {
      var k = String(x.mappingReadFrom || '').toLowerCase();
      return { url: u, label: TEXT_KIND[k] || (k ? k.replace(/_/g, ' ') : 'Bill text') };
    }
    var bp = x.congressGovUrl || x.billStatusUrl;
    if (bp) return { url: String(bp), label: 'Official bill page' };
    if (m && m.source && m.source.url) return { url: m.source.url, label: m.source.label || 'Official record' };
    return null;
  }
  function officialTitleOf(m) {
    var t = extIds(m).officialTitle;
    return (typeof t === 'string' && t.trim()) ? t.trim() : '';
  }
  // The day this measure was last decided on the floor, from the roll calls we hold.
  function decidedDate(rollcalls) {
    var best = '';
    (rollcalls || []).forEach(function (rc) {
      var d = rc && rc.voteDate ? String(rc.voteDate) : '';
      if (d && (!best || d > best)) best = d;
    });
    return best;
  }
  // THE KEY GLOSSARY IS A GUEST, NOT A DEPENDENCY. issue-scope.js publishes the
  // shipped scope prose for an issue key; if it is not on the page a chip loses its
  // ⓘ and keeps its door. And the control is mounted as a SIBLING of the chip, never
  // inside it — this panel's delegate resolves closest('[data-issue]'), so a ⓘ
  // nested in the chip would be swallowed by the chip's destination and the scope
  // card would never open. Two destinations, two controls, no interception.
  function scopeControlHtml(key) {
    try {
      var S = window.PDXIssueScope;
      if (!S || typeof S.controlHtml !== 'function') return '';
      return S.controlHtml(key) || '';
    } catch (e) { return ''; }
  }

  // ── ONE PALETTE FOR THE WHOLE SITE ──────────────────────────────────────────
  // A topic chip on the act face has to be the SAME COLOUR as that topic in the
  // tree, on a stance chip and in compare, or the colour stops being information
  // and becomes decoration. issue-colors.js is the only place that decides; this
  // function does nothing but ask it and hand back the inline custom properties.
  //   It fails open. No issue-colors.js on the page (offline lite boot, a stripped
  // test sandbox) and every chip renders in the neutral house style instead of
  // throwing — a colourless chip is still a working door.
  //   IT ALSO MUST NOT BECOME A RANK. The tint is keyed on the ISSUE, never on
  // whether the mapping was this bill's subject or rode inside; provenance stays a
  // written label on the chip. Two chips of the same colour and different lanes is
  // the correct rendering of "one instrument, two ways in".
  function issueTint(key) {
    try {
      var C = window.PDXIssueColors;
      if (!C || typeof C.styleFor !== 'function') return '';
      var st = C.styleFor(key);
      if (!st) return '';
      return ' data-ic="on" style="' + escAttr(st) + '"';
    } catch (e) { return ''; }
  }

  // ── BIG PICTURE ORDER: THE WHOLE MENU, UNRANKED ─────────────────────────────
  // THE CITIZEN BIG PICTURE IGNORES `isPrimary` AS A VISIBILITY RULE. A mapping's
  // primary flag and its curated `weight` decide nothing on this face: not whether
  // a topic appears, not where it appears, not how loudly. Both still travel in the
  // payload and both are still read by the INTERNAL anti-noise machinery that
  // already depends on them — _recordDirectionIndex()'s not-incidental floor in
  // stance-helpers.js, the strongest-citable-example pick in receipt-cards.js — and
  // that is the only use either flag has until a later engine decision retires or
  // repurposes them. Nothing in this file may reintroduce them as a rank.
  //   WHAT ORDERS THE LIST INSTEAD, in order of preference:
  //     1. the reader's own picked issues (window._alignIssues). The one legitimate
  //        reason to move a row up the page is that this reader asked for it.
  //     2. the shipped category order (_pdxIssueCatOf → _pdxIssueCategories), so the
  //        same act reads the same way down the page every time and related topics
  //        sit together instead of scattering.
  //     3. the display label alphabetically, then the raw key. Both are arbitrary,
  //        and arbitrary is the point: no reader mistakes alphabetical order for a
  //        judgement about which topic this act was really about.
  //   Every step fails open — an unknown category sorts last, it never hides a row.
  function alignSet() {
    try {
      var s = window._alignIssues;
      return (s && typeof s.has === 'function' && s.size) ? s : null;
    } catch (e) { return null; }
  }
  var _CAT_RANK = null;
  function catRank(key) {
    if (!_CAT_RANK) {
      var built = {}, n = 0;
      try {
        var cats = (typeof window._pdxIssueCategories === 'function') ? window._pdxIssueCategories() : [];
        for (var i = 0; i < cats.length; i++) { if (cats[i] && cats[i].key) { built[cats[i].key] = i; n++; } }
      } catch (e) {}
      if (!n) return 999; // taxonomy not loaded yet — don't cache an empty table
      _CAT_RANK = built;
    }
    var cat = '';
    try { if (typeof window._pdxIssueCatOf === 'function') cat = window._pdxIssueCatOf(key) || ''; } catch (e) {}
    var r = _CAT_RANK[cat];
    return (typeof r === 'number') ? r : 999;
  }
  //   THIS ORDER IS NOW SHARED. It was written here first, and it is the same
  // question the record card, the profile highlight and the library card were each
  // answering with the score sort. window._pdxBigPictureOrder in stance-helpers.js
  // is the one copy; this delegates to it and keeps the local sort as the fallback
  // for the case where that file has not loaded, so the page can lose the helper
  // without silently regaining a primary-first list.
  function bigPictureOrder(list) {
    var mine = alignSet();
    try {
      if (typeof window._pdxBigPictureOrder === 'function') {
        return window._pdxBigPictureOrder(list, { labelFn: issueLabel, firstKeys: mine });
      }
    } catch (e) {}
    return (list || []).slice().sort(function (a, b) {
      var ka = (a && a.issueKey) || '', kb = (b && b.issueKey) || '';
      var ma = (mine && mine.has(ka)) ? 0 : 1, mb = (mine && mine.has(kb)) ? 0 : 1;
      if (ma !== mb) return ma - mb;
      var ca = catRank(ka), cb = catRank(kb);
      if (ca !== cb) return ca - cb;
      var cmp = String(issueLabel(ka)).localeCompare(String(issueLabel(kb)));
      if (cmp) return cmp;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  }

  // The same order for a bare list of issue KEYS. The light index and the lite
  // fallback below hold keys rather than mappings, and a chip row built from keys
  // must read in the same sequence as the ledger built from mappings.
  function bigPictureKeys(keys) {
    var seen = {}, objs = [];
    (keys || []).forEach(function (k) { if (k && !seen[k]) { seen[k] = 1; objs.push({ issueKey: k }); } });
    return bigPictureOrder(objs).map(function (o) { return o.issueKey; });
  }

  // ── one member's vote, topic by topic ───────────────────────────────────────
  // A Yea is a Yea on every topic the act maps to, so every mapped topic is listed
  // here as a real effect of this member's vote. The say-vs-do verdict is an EXTRA
  // that lands on the rows where a stated stance exists — its ABSENCE no longer
  // deletes the topic from the member's row, which is how a fourteen-topic act used
  // to shrink to the two topics we happened to hold a stance on. Disclosure, not
  // deletion: the caption says "On this act" rather than stamping a pattern badge
  // on what may be the member's only item on any of these keys.
  var VERDICT = {
    consistent: { cls: 'bd-v-consistent', label: '✓ matches stance' },
    contradicts: { cls: 'bd-v-contradicts', label: '⚠ against stance' },
    mixed: { cls: 'bd-v-mixed', label: 'mixed' },
    no_position: { cls: 'bd-v-neutral', label: 'no position' }
  };
  function memberOnAct(pid, position, issues) {
    if (typeof window._measureComponentBreakdown !== 'function') return null;
    var pm = {};
    try { if (typeof window._polPositionMap === 'function') pm = window._polPositionMap(pid, prof(pid)) || {}; } catch (e) {}
    var brk = window._measureComponentBreakdown({ position: position, issues: issues }, pm, { labelFn: issueLabel });
    var comps = bigPictureOrder(brk.components);
    if (!comps.length) return null;
    var con = 0, against = 0;
    comps.forEach(function (c) {
      if (!c.hasStance) return;
      if (c.verdict === 'consistent') con++; else if (c.verdict === 'contradicts') against++;
    });
    var rows = comps.map(function (c) {
      var eff = c.effect === 'advances'
        ? '<span class="bd-eff bd-eff-adv">their vote advances this</span>'
        : c.effect === 'opposes'
          ? '<span class="bd-eff bd-eff-opp">their vote cuts against this</span>' : '';
      var v = (c.hasStance && VERDICT[c.verdict])
        ? '<span class="bd-v ' + VERDICT[c.verdict].cls + '">' + esc(VERDICT[c.verdict].label) + '</span>' : '';
      return '<div class="bd-svd-row"><span class="bd-svd-issue">' + esc(c.label) + '</span>' + eff + v + '</div>';
    }).join('');
    var summary = '<span class="bd-svd-count">' + comps.length + ' topic' + (comps.length !== 1 ? 's' : '') + '</span>' +
      (con ? '<span class="bd-v bd-v-consistent">✓ ' + con + '</span>' : '') +
      (against ? '<span class="bd-v bd-v-contradicts">⚠ ' + against + '</span>' : '');
    return {
      summary: summary,
      rows: '<div class="bd-svd-cap">On this act — every topic it maps to, and what this vote did to each:</div>' + rows,
      hasContradiction: against > 0
    };
  }

  // ── section builders ────────────────────────────────────────────────────────
  // THE LEDGER IS THE ACT. Every issue this instrument is mapped to, enumerated —
  // no truncation, no rank badge, no primary-first sort. Each row gets the same
  // structure and the same access to mechanism, because a citizen opening an act
  // is owed the whole menu it enacted, topic by topic, before anyone tells them
  // which parts mattered. Copy that would minimise a row — "secondary",
  // "supporting only", "narrow" as a STATUS — does not belong here; where
  // narrowness is a fact about a mapping it belongs in that row's explanation
  // sentence, which is the one place it can be read rather than ranked.
  // How a topic got into the act, in words, on the row. Both values are drawn the
  // same size and in the same place: one line of provenance, not a rank.
  function laneLabel(isPrimary) { return isPrimary ? 'This bill’s subject' : 'Rode inside this bill'; }

  // ── READER COPY ONLY ────────────────────────────────────────────────────────
  // `vr_measure_issues.rationale` is a working field. It carries the sentence this
  // row exists to print — what the section did — and, in a couple of dozen places,
  // notes the curators wrote to each other: how heavily a key was weighted, which
  // key holds the primary flag, which row it was ranked below, which taxonomy split
  // it was re-keyed in, which migration filed it. Inside a curator tool that is
  // provenance sitting next to the thing it qualifies. On a voter's face it is a
  // stranger's filing system printed as if it were a finding, and "Weighted 80"
  // invites a reader to believe their representative's vote counted 80 percent on
  // this topic. It did not. It counted in full.
  //   The scrubbing lives in ONE place — receipt-cards.js, which already owns the
  // question "may a reader see this sentence" for share cards — and is reached here
  // through the same window handle the shared ordering helper uses. A second
  // implementation on this face is how one of the two falls behind the other.
  //   When the helper is not loaded (a stripped boot, an offline lite page) the row
  // prints NO scope sentence rather than an unscrubbed one. That is the failure
  // direction to choose: the letterhead already has honest words for a topic this
  // profile cannot describe, and no reader is worse off for a missing sentence than
  // for a note between curators dressed as a finding.
  function scopeSentence(it) {
    var raw = (it && it.rationale) ? String(it.rationale) : '';
    if (!raw) return '';
    var fn = window._pdxReaderRationale;
    if (typeof fn !== 'function') return '';
    try { return fn(raw) || ''; } catch (e) { return ''; }
  }

  function omnibusSection(m, issues) {
    if (!issues || !issues.length) return '';
    var ordered = bigPictureOrder(issues);
    // ONE SHORT ROW PER KEY, AND NOTHING ABOVE THEM. This section used to open with
    // a paragraph restating that a single vote decides every row, plus a lane
    // disclaimer, plus a direction tally — all three of which the letterhead
    // directly above already says, in fewer words, before the reader scrolls. What
    // is left is the thing only this section can give: for each topic, what the act
    // did on it and which way a Yea cuts.
    var rows = ordered.map(function (it) {
      var opposes = it.supportMeaning === 'yea_opposes';
      var effCls = opposes ? 'bd-eff-opp' : 'bd-eff-adv';
      var effTxt = opposes ? 'A Yea cuts against this' : 'A Yea advances this';
      // The scope sentence is the curators' own words about what the act did here,
      // with their notes to each other taken out. Never rewritten, never
      // summarised, and never composed — a row with nothing publishable left says
      // nothing, and the letterhead's tally counts it as unexplained.
      var why = scopeSentence(it);
      // `data-bd-lane` is a FILTER KEY AND NOTHING ELSE. It carries the curated
      // primary flag so the optional view control below has something to slice on;
      // it sets no default, hides nothing on its own, and no styling reads it
      // except the two display rules the filter itself installs.
      return '<div class="bd-omni-row' + (opposes ? ' bd-omni-opp' : '') + '"' +
          ' data-bd-lane="' + (it.isPrimary ? 'main' : 'other') + '">' +
        '<div class="bd-omni-head">' +
          '<button type="button" class="bd-omni-issue bd-omni-link" data-issue="' + escAttr(it.issueKey) + '" title="See the ' + escAttr(issueLabel(it.issueKey)) + ' spotlight">' + esc(issueLabel(it.issueKey)) + '</button>' +
          '<span class="bd-omni-lane-l">' + esc(laneLabel(it.isPrimary)) + '</span>' +
          '<span class="bd-eff ' + effCls + '">' + effTxt + '</span>' +
        '</div>' +
        (why ? '<div class="bd-omni-why">' + esc(why) + '</div>' : '') +
      '</div>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">📦 Every topic this act touches</h3>' +
      '<div class="bd-omni-view">' + viewFilter(ordered) +
        '<div class="bd-omni-list" data-bd-view="all">' + rows + '</div>' +
      '</div></section>';
  }

  // ── the optional view filter ────────────────────────────────────────────────
  // A VIEW FILTER, NOT A RANKING. These buttons slice a list the reader already
  // has in front of them; they never decide which rows exist. Three properties
  // hold that line and the tests pin all three:
  //   · "All topics" is the default and the only state the panel ever opens in.
  //   · The slice labels describe what a slice CONTAINS ("titles often described
  //     as the vehicle's main jobs") rather than promoting one over the other. No
  //     button says primary, secondary or supporting.
  //   · The control is only drawn when both slices are non-empty, so it can never
  //     appear as a filter that filters to everything or to nothing.
  // It fails open: with scripting unavailable the buttons are inert and every row
  // stays on screen, because the visible state lives in one attribute whose
  // shipped value is "all".
  function viewFilter(ordered) {
    var main = 0, other = 0;
    ordered.forEach(function (it) { if (it.isPrimary) main++; else other++; });
    if (!main || !other) return '';
    var btn = function (key, label, on) {
      return '<button type="button" class="bd-vf-btn" data-bd-view-set="' + key + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>';
    };
    return '<div class="bd-viewfilter" role="group" aria-label="Filter the topic list">' +
      '<span class="bd-vf-lab">View</span>' +
      btn('all', 'All topics (' + ordered.length + ')', true) +
      btn('main', 'Titles often described as the vehicle’s main jobs (' + main + ')', false) +
      btn('other', 'Other provisions in this act (' + other + ')', false) +
    '</div>';
  }

  // The four positions a roll call records, in the order the tally prints them.
  // `present` and `not_voting` are kept apart because they are different acts:
  // one is a member in the chamber declining to take a side, the other is a member
  // who was not counted at all. Collapsing them would be a small lie about both.
  var POS_SLOTS = [
    ['yea', 'Yea'], ['nay', 'Nay'], ['present', 'Present'], ['not_voting', 'Did not vote']
  ];
  function posKey(pos) {
    var p = String(pos || '');
    return p ? ' data-bd-pos="' + escAttr(p) + '"' : '';
  }
  // What the closed drawer promises before it is opened: how many names are inside,
  // and whether the reader's own representatives are among them. Both are facts
  // about the list, so a reader can decide whether opening it is worth the tap.
  function rollPromise(votes) {
    var mine = 0;
    votes.forEach(function (v) { if (isLocal(v.politicianId)) mine++; });
    return votes.length + ' name' + (votes.length !== 1 ? 's' : '') + ' on this roll call' +
      (mine ? ' · your ' + mine + ' rep' + (mine !== 1 ? 's' : '') + ' first' : '');
  }
  // The reader's own controls over a list of several hundred names: which position
  // to show, and a name to look for. Neither is a summary and neither changes a
  // count anywhere on this face — every row stays in the markup and the filter is
  // one CSS rule keyed to the reader's own choice, exactly as the topic ledger's
  // view control already works.
  //   A slot with nobody in it gets no button. An empty filter that silently shows
  // nothing reads as a bug; an absent one reads as the record.
  function rollFilter(votes) {
    var n = {};
    votes.forEach(function (v) { var k = String(v.position || ''); n[k] = (n[k] || 0) + 1; });
    var slots = [];
    POS_SLOTS.forEach(function (sl) { if (n[sl[0]]) slots.push([sl[0], sl[1], n[sl[0]]]); });
    // A filter with one slice in it is a control that cannot do anything: if every
    // member on this roll call voted the same way, the pills would only ever say
    // "all" twice. The count is already on the tally above, so the pills go and the
    // search stays.
    var btns = slots.length > 1 ? [['all', 'All', votes.length]].concat(slots) : [];
    var pills = btns.length
      ? '<div class="bd-rf-pills">' + btns.map(function (b, i) {
          return '<button type="button" class="bd-rf-btn" data-bd-roll-set="' + escAttr(b[0]) + '"' +
            ' aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' +
            esc(b[1]) + ' <b>' + b[2] + '</b></button>';
        }).join('') + '</div>'
      : '';
    return '<div class="bd-rf" role="group" aria-label="Show part of this roll call">' +
      pills +
      '<label class="bd-rf-find">' +
        '<span class="bd-rf-find-l">Find a name</span>' +
        '<input type="search" class="bd-rf-in" data-bd-roll-find' +
          ' placeholder="Type part of a name" autocomplete="off" spellcheck="false">' +
      '</label>' +
      '<p class="bd-rf-none" role="status" aria-live="polite"></p>' +
    '</div>';
  }

  function rollcallsSection(m, issues, rollcalls) {
    if (!rollcalls || !rollcalls.length) {
      return '<section class="bd-sec" data-bd-anchor="rolls"><h3 class="bd-h">🗳️ Roll-call votes</h3><p class="bd-empty">No recorded roll-call votes for this measure yet.</p></section>';
    }
    var blocks = rollcalls.map(function (rc) {
      var t = rc.totals || {};
      var tally = ['yea', 'nay', 'present', 'notVoting'].map(function (k) {
        if (t[k] == null) return '';
        var lb = k === 'notVoting' ? 'Not voting' : k.charAt(0).toUpperCase() + k.slice(1);
        return '<span class="bd-tally bd-tally-' + k + '">' + lb + ' ' + t[k] + '</span>';
      }).filter(Boolean).join('');
      var head = '<div class="bd-rc-head">' +
        '<span class="bd-rc-q">' + esc(rc.question || 'Vote') + '</span>' +
        '<span class="bd-rc-meta">' + [chamberLabel(rc.chamber), fmtDate(rc.voteDate), rc.result ? statusLabelResult(rc.result) : ''].filter(Boolean).join(' · ') + '</span>' +
        '</div>' + (tally ? '<div class="bd-tallies">' + tally + '</div>' : '');

      var votes = (rc.votes || []).slice();
      var rows = '';
      if (votes.length) {
        // Viewer's own reps first, then Yea, Nay, Present; alpha within each.
        var rank = { yea: 1, nay: 2, present: 3, not_voting: 4 };
        votes.sort(function (a, b) {
          var la = isLocal(a.politicianId), lb = isLocal(b.politicianId);
          if (la !== lb) return la ? -1 : 1;
          var ra = rank[a.position] || 5, rb = rank[b.position] || 5;
          if (ra !== rb) return ra - rb;
          return nameFor(a.politicianId).localeCompare(nameFor(b.politicianId));
        });
        var heavy = votes.length > 60; // keep the DOM light on very large roll calls
        rows = votes.map(function (v) {
          var pos = v.position;
          var pcls = pos === 'yea' ? 'bd-pos-yea' : pos === 'nay' ? 'bd-pos-nay' : 'bd-pos-neutral';
          var plabel = pos === 'yea' ? 'Yea' : pos === 'nay' ? 'Nay' : pos === 'present' ? 'Present' : pos === 'not_voting' ? 'Not voting' : pos;
          var relTag = isLocal(v.politicianId) ? '<span class="bd-rel">Your rep</span>' : '';
          var svd = heavy ? null : memberOnAct(v.politicianId, pos, issues);
          var nameBtn = '<button type="button" class="bd-vote-name" data-pid="' + escAttr(v.politicianId) + '">' + esc(nameFor(v.politicianId)) + '</button>';
          if (svd) {
            return '<details class="bd-vote-row bd-vote-exp' + (svd.hasContradiction ? ' bd-vote-contra' : '') + '"' + posKey(pos) + '>' +
              '<summary class="bd-vote-sum">' + nameBtn + relTag +
                '<span class="bd-pos ' + pcls + '">' + plabel + '</span>' +
                '<span class="bd-svd-mini">' + svd.summary + '</span>' +
              '</summary>' +
              '<div class="bd-svd-body">' + svd.rows + '</div>' +
            '</details>';
          }
          return '<div class="bd-vote-row"' + posKey(pos) + '>' + nameBtn + relTag + '<span class="bd-pos ' + pcls + '">' + plabel + '</span></div>';
        }).join('');
        if (heavy) rows = '<p class="bd-note">The per-member topic breakdown is available on smaller roll calls; the full topic list for this act is above, and a profile carries the same breakdown per member.</p>' + rows;
      } else {
        rows = '<p class="bd-empty">Individual member votes for this roll call are not in the record yet.</p>';
      }
      var src = rc.source && rc.source.url
        ? '<a class="bd-src" href="' + escAttr(rc.source.url) + '" target="_blank" rel="noopener">🔗 ' + esc(rc.source.label || 'Official roll call') + '</a>' : '';
      // THE TALLY IS THE FACE; THE NAMES ARE BEHIND A DOOR. On a full House roll
      // call the list below is 430 rows, and printed open it buried the tallies,
      // the topic ledger and everything else on this face under a wall of names.
      // Closed, the reader meets the numbers first and opens the names when the
      // names are what they came for — which is exactly what the letterhead's
      // "See who voted" strip has always promised.
      //   The rows are STILL IN THE DOM, all of them, unsummarised and untruncated.
      // A closed <details> is not a filter and not a cap: find-in-page reaches them
      // once open, the browser paints none of them until then, and no count on this
      // page is computed from what happens to be visible.
      var list = votes.length
        ? '<details class="bd-rolldrop">' +
            '<summary class="bd-roll-sum">' +
              '<span class="bd-roll-sum-t">👥 See who voted</span>' +
              '<span class="bd-roll-sum-n">' + esc(rollPromise(votes)) + '</span>' +
            '</summary>' +
            '<div class="bd-rollbody">' + rollFilter(votes) +
              '<div class="bd-votes" data-bd-roll-view="all">' + rows + '</div>' +
            '</div>' +
          '</details>'
        : '<div class="bd-votes">' + rows + '</div>';
      return '<div class="bd-rc"' + (rc.id != null ? ' data-bd-rc="' + escAttr(String(rc.id)) + '"' : '') + '>' +
        head + list + src + '</div>';
    }).join('');
    return '<section class="bd-sec" data-bd-anchor="rolls"><h3 class="bd-h">🗳️ Roll-call votes</h3>' + blocks + '</section>';
  }
  function statusLabelResult(r) { return String(r || '').replace(/_/g, ' ').replace(/\b\w/, function (c) { return c.toUpperCase(); }); }

  function sponsorsSection(m, positions) {
    var sponsors = [];
    var seen = {};
    if (m.sponsorId) { sponsors.push({ pid: m.sponsorId, role: 'Sponsor' }); seen[m.sponsorId] = 1; }
    (positions || []).forEach(function (p) {
      var role = p.actionType === 'sponsor' ? 'Sponsor' : p.actionType === 'cosponsor' ? 'Cosponsor' : null;
      if (!role || seen[p.politicianId]) return;
      seen[p.politicianId] = 1;
      sponsors.push({ pid: p.politicianId, role: role, source: p.source });
    });
    if (!sponsors.length) return '';
    var chips = sponsors.map(function (s) {
      return '<button type="button" class="bd-person" data-pid="' + escAttr(s.pid) + '">' +
        '<span class="bd-person-name">' + esc(nameFor(s.pid)) + '</span>' +
        '<span class="bd-person-role">' + esc(s.role) + '</span></button>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">✍️ Sponsors &amp; cosponsors</h3><div class="bd-people">' + chips + '</div></section>';
  }

  // Key member actions that aren't roll-call votes or sponsorships: on-record
  // statements, committee votes, amicus briefs, litigation. Surfaces vr_positions the
  // sponsors section doesn't (e.g., the bipartisan authors of an amendment), each with
  // its note and source. Degrades to nothing when there are none.
  var ACTION_LABEL = {
    statement: 'On record', committee_vote: 'Committee vote', amicus: 'Amicus brief',
    plaintiff: 'Plaintiff', cosponsor: 'Cosponsor', sponsor: 'Sponsor',
    // ✒️ Executive Enactment Record action types. vr_positions records the ACT of
    // signing or issuing; there is no roll call behind either, and neither is ever
    // rendered as one.
    signed: 'Signed into law', issued: 'Issued', vetoed: 'Vetoed'
  };
  // Actions that belong to the executive lane rather than the member lane.
  var EXEC_ACTION_TYPES = { signed: 1, issued: 1, vetoed: 1 };
  function isExecAction(p) { return !!(p && EXEC_ACTION_TYPES[p.actionType]); }

  // ── Axis B · standing ───────────────────────────────────────────────────────
  // What happened to a formal executive action AFTER it was signed or issued, from
  // the append-only vr_exec_action_status log the measure API now serves. The labels
  // come from the shipped PDXExecRecord.STANDING table so this panel and the profile
  // lane cannot drift; with that global absent the raw token is humanized, which says
  // the same thing in plainer type rather than guessing at a nicer one.
  //
  // LANE DISCIPLINE: no percentage, no ratio, and no vote language on any of this —
  // an order that was signed was not voted on, and a court that blocked it did not
  // hold a roll call.
  function standingMeta(token) {
    var t = String(token || '');
    try {
      var tbl = window.PDXExecRecord && window.PDXExecRecord.STANDING;
      if (tbl && tbl[t]) return tbl[t];
    } catch (e) {}
    if (!t) return null;
    return {
      key: t, ico: '•', contested: false, cls: 'exec-unknown',
      label: t.replace(/_/g, ' ').replace(/\b\w/, function (c) { return c.toUpperCase(); })
    };
  }
  function standingChip(token) {
    var meta = standingMeta(token);
    if (!meta) return '';
    return '<span class="bd-stand bd-stand-' + (meta.contested ? 'contested' : 'clear') + '">' +
      esc(meta.ico) + ' ' + esc(meta.label) + '</span>';
  }
  function standingEntryHtml(s) {
    var when = s.effectiveAt ? '<span class="bd-stand-when">' + esc(fmtDate(s.effectiveAt)) + '</span>' : '';
    var who = s.authority ? '<span class="bd-stand-who">' + esc(s.authority) + '</span>' : '';
    var src = (s.source && s.source.url)
      ? '<a class="bd-src" href="' + escAttr(s.source.url) + '" target="_blank" rel="noopener">🔗 ' +
        esc(s.source.label || 'Primary source') + '</a>' : '';
    return '<div class="bd-stand-entry">' +
      '<div class="bd-stand-head">' + standingChip(s.status) + when + who + '</div>' +
      (s.note ? '<div class="bd-omni-why">' + esc(s.note) + '</div>' : '') +
      (src ? '<div class="bd-stand-src">' + src + '</div>' : '') +
    '</div>';
  }
  // The whole log, newest first, with the earlier entries collapsed. Every entry is a
  // separate sourced change: an order that was in force, then partly blocked, is two
  // facts, and showing only the latest throws away the one that explains it.
  function standingHtml(p) {
    var log = (p && p.standing) || [];
    if (!log.length) {
      // FAIL CLOSED. Nothing citable on file is not "in force" — it is unknown, and
      // it says so rather than leaving the reader to assume the action is operative.
      return '<div class="bd-stand-entry bd-stand-none">' +
        '<span class="bd-stand bd-stand-none-chip">◌ No standing on file</span>' +
        '<div class="bd-omni-why">Nothing on file records what happened to this action afterwards. ' +
        'That is a gap in the record here, not a finding that it stands unchallenged.</div></div>';
    }
    var newest = log.slice().reverse();
    var head = standingEntryHtml(newest[0]);
    var rest = newest.slice(1);
    if (!rest.length) return head;
    return head + '<details class="bd-stand-more"><summary>' + rest.length +
      ' earlier recorded change' + (rest.length !== 1 ? 's' : '') + '</summary>' +
      rest.map(standingEntryHtml).join('') + '</details>';
  }

  // ✒️ The executive lane's own section: who signed or issued this measure, and where
  // it stands now. Kept out of "Key member actions" because a president signing a law
  // is not a member action, and the two lanes are never blended.
  function execActionsSection(m, positions) {
    var rows = (positions || []).filter(isExecAction);
    if (!rows.length) return '';
    var html = rows.map(function (p) {
      var when = p.actedAt ? '<span class="bd-stand-when">' + esc(fmtDate(p.actedAt)) + '</span>' : '';
      var src = (p.source && p.source.url)
        ? '<a class="bd-src" href="' + escAttr(p.source.url) + '" target="_blank" rel="noopener">🔗 ' +
          esc((p.source && p.source.label) || 'Official record') + '</a>' : '';
      return '<div class="bd-omni-row">' +
        '<div class="bd-omni-head">' +
          '<button type="button" class="bd-vote-name" data-pid="' + escAttr(p.politicianId) + '">' + esc(nameFor(p.politicianId)) + '</button>' +
          '<span class="bd-prov-tag">' + esc(ACTION_LABEL[p.actionType] || p.actionType) + '</span>' + when +
        '</div>' +
        (p.note ? '<div class="bd-omni-why">' + esc(p.note) + '</div>' : '') +
        (src ? '<div class="bd-stand-src">' + src + '</div>' : '') +
        '<div class="bd-stand-log">' + standingHtml(p) + '</div>' +
      '</div>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">✒️ Executive action &amp; where it stands</h3>' +
      '<p class="bd-lead">The formal act of signing or issuing this measure, and what has happened to it since. ' +
      'Each change is its own dated entry with its own primary source.</p>' + html + '</section>';
  }

  function memberActionsSection(m, positions) {
    var rows = (positions || []).filter(function (p) {
      return p.actionType && p.actionType !== 'sponsor' && p.actionType !== 'cosponsor' && !isExecAction(p);
    });
    if (!rows.length) return '';
    var html = rows.map(function (p) {
      var eff = (p.supports === true)
        ? '<span class="bd-eff bd-eff-adv">Supported</span>'
        : (p.supports === false ? '<span class="bd-eff bd-eff-opp">Opposed</span>' : '');
      var src = (p.source && p.source.url)
        ? '<a class="bd-src" href="' + escAttr(p.source.url) + '" target="_blank" rel="noopener">🔗 source</a>' : '';
      return '<div class="bd-omni-row">' +
        '<div class="bd-omni-head">' +
          '<button type="button" class="bd-vote-name" data-pid="' + escAttr(p.politicianId) + '">' + esc(nameFor(p.politicianId)) + '</button>' +
          '<span class="bd-prov-tag">' + esc(ACTION_LABEL[p.actionType] || p.actionType) + '</span>' + eff +
        '</div>' +
        (p.note ? '<div class="bd-omni-why">' + esc(p.note) + ' ' + src + '</div>' : (src ? '<div class="bd-omni-why">' + src + '</div>' : '')) +
      '</div>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">🧭 Key member actions</h3>' +
      '<p class="bd-lead">On-record actions by members on this measure beyond a floor roll call.</p>' + html + '</section>';
  }

  var STAGE_LABEL = {
    introduced: 'Introduced', referred_committee: 'Referred to committee',
    reported_committee: 'Reported from committee', passed_house: 'Passed House',
    passed_senate: 'Passed Senate', resolving_differences: 'Resolving differences',
    to_president: 'To the President', enacted: 'Enacted', vetoed: 'Vetoed',
    veto_overridden: 'Veto overridden', failed: 'Failed', other: 'Action'
  };

  // The real legislative timeline from vr_measure_actions when present; otherwise a
  // lightweight timeline synthesized from introduction + roll calls + status (so a
  // bill with no actions rows still reads sensibly). Phase 3 replaces the old
  // always-synthesized version with the sourced table.
  function timelineSection(m, rollcalls, actions) {
    var events = [];
    if (actions && actions.length) {
      events = actions.map(function (a) {
        return {
          date: a.actionDate,
          label: (STAGE_LABEL[a.stage] || a.stage) + (a.chamber && a.stage !== 'introduced' && a.stage.indexOf('passed_') !== 0 ? '' : ''),
          sub: a.text || '',
          url: a.source && a.source.url
        };
      });
    } else {
      if (m.introducedAt) events.push({ date: m.introducedAt, label: 'Introduced', sub: chamberLabel(m.chamber) });
      (rollcalls || []).forEach(function (rc) {
        events.push({
          date: rc.voteDate,
          label: (chamberLabel(rc.chamber) ? chamberLabel(rc.chamber) + ' — ' : '') + (rc.question || 'Vote'),
          sub: [rc.result ? statusLabelResult(rc.result) : '', rc.totals && rc.totals.yea != null ? (rc.totals.yea + '–' + (rc.totals.nay != null ? rc.totals.nay : '?')) : ''].filter(Boolean).join(' · '),
          url: rc.source && rc.source.url
        });
      });
      if (m.status && ['enacted', 'vetoed', 'failed'].indexOf(m.status) !== -1) {
        events.push({ date: null, label: statusLabel(m.status), sub: 'Final status' });
      }
      events.sort(function (a, b) { return (a.date ? new Date(a.date).getTime() : Infinity) - (b.date ? new Date(b.date).getTime() : Infinity); });
    }
    if (events.length < 2) return '';
    var items = events.map(function (e) {
      return '<li class="bd-tl-item"><span class="bd-tl-dot" aria-hidden="true"></span>' +
        '<div class="bd-tl-body"><span class="bd-tl-date">' + (e.date ? esc(fmtDate(e.date)) : '') + '</span>' +
        '<span class="bd-tl-label">' + (e.url ? '<a href="' + escAttr(e.url) + '" target="_blank" rel="noopener">' + esc(e.label) + '</a>' : esc(e.label)) + '</span>' +
        (e.sub ? '<span class="bd-tl-sub">' + esc(e.sub) + '</span>' : '') + '</div></li>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">🕒 How it moved</h3><ul class="bd-tl">' + items + '</ul></section>';
  }

  // Named omnibus provisions (vr_measure_provisions) — one level finer than the
  // component issues, each with which way a Yea cuts and a source.
  function provisionsSection(m, provisions) {
    if (!provisions || !provisions.length) return '';
    var rows = provisions.map(function (p) {
      var opposes = p.supportMeaning === 'yea_opposes';
      var eff = '<span class="bd-eff ' + (opposes ? 'bd-eff-opp' : 'bd-eff-adv') + '">' + (opposes ? 'A Yea cuts against this' : 'A Yea advances this') + '</span>';
      var tag = p.issueKey ? '<span class="bd-prov-tag">' + esc(issueLabel(p.issueKey)) + '</span>' : '';
      var src = (p.source && p.source.url) ? '<a class="bd-src" href="' + escAttr(p.source.url) + '" target="_blank" rel="noopener">🔗 source</a>' : '';
      return '<div class="bd-omni-row">' +
        '<div class="bd-omni-head"><span class="bd-omni-issue">' + esc(p.label) + '</span>' + tag + eff + '</div>' +
        (p.description ? '<div class="bd-omni-why">' + esc(p.description) + ' ' + src + '</div>' : (src ? '<div class="bd-omni-why">' + src + '</div>' : '')) +
      '</div>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">🧩 Key provisions</h3>' +
      '<p class="bd-lead">The named pieces bundled into this measure, and which way a Yea cuts on each.</p>' + rows + '</section>';
  }

  // Distributional Impact Ledger ("Who It Affects"). Fully delegated to the standalone
  // PDXImpactLedger module so the neutral cohort bar / reasons / evidence badges live in
  // one place and can be reused elsewhere. Degrades to nothing when the module or the
  // sourced data is absent — this panel never fabricates an impact.
  function impactLedgerSection(data) {
    try {
      var il = G('PDXImpactLedger');
      if (il && typeof il.renderHTML === 'function') return il.renderHTML(data) || '';
    } catch (e) {}
    return '';
  }

  function relatedSection(m, issues) {
    var parts = [];
    // Link back into the central discovery hub: searching the bill number in the
    // All-Seeing Eye surfaces this bill alongside every related politician, issue and
    // Spotlight in one place. Always available (a bill always has a number).
    if (m && m.number) {
      parts.push('<div class="bd-rel-group"><div class="bd-rel-lab">Find everything connected</div>' +
        '<button type="button" class="bd-btn bd-eye" data-eye="' + escAttr(m.number) + '">🔍 Search this in the All-Seeing Eye</button></div>');
    }
    // Explore-these-issues jump chips + a link back into the Legislation library.
    // EVERY MAPPED TOPIC GETS A CHIP. This list used to be cut at eight, which on a
    // reconciliation vehicle silently deleted the tail of the act from the one place
    // a reader could jump into those topics — and, because the list arrived
    // primary-first, the eight that survived were the eight the curation had already
    // called the important ones. It is enumerated in the same Big Picture order the
    // ledger above uses, and the library button follows the first row of THAT order
    // rather than reaching past it for a primary flag.
    if (issues && issues.length) {
      var ordered = bigPictureOrder(issues);
      var leadKey = (ordered[0] || {}).issueKey || '';
      var chips = ordered.map(function (it) {
        return '<button type="button" class="bd-person bd-issuejump" data-issue="' + escAttr(it.issueKey) + '">' +
          '<span class="bd-person-name">🔎 ' + esc(issueLabel(it.issueKey)) + '</span>' +
          '<span class="bd-person-role">Issue spotlight</span></button>';
      }).join('');
      parts.push('<div class="bd-rel-group"><div class="bd-rel-lab">Explore these issues</div><div class="bd-people">' + chips + '</div>' +
        (leadKey ? '<button type="button" class="bd-btn bd-legis" data-legis="' + escAttr(leadKey) + '">🏛️ Browse related bills in the Legislation library</button>' : '') +
      '</div>');
    }
    // Issue Spotlights tied to any of this bill's component issues (when available).
    try {
      var sp = G('PDXSpotlight');
      if (sp && typeof sp.forIssueKey === 'function') {
        var seen = {}, spots = [];
        (issues || []).forEach(function (it) {
          (sp.forIssueKey(it.issueKey) || []).forEach(function (s) {
            if (s && s.slug && !seen[s.slug]) { seen[s.slug] = 1; spots.push(s); }
          });
        });
        if (spots.length) {
          parts.push('<div class="bd-rel-group"><div class="bd-rel-lab">Issue Spotlights</div><div class="bd-people">' +
            spots.slice(0, 6).map(function (s) {
              return '<button type="button" class="bd-person bd-spot" data-slug="' + escAttr(s.slug) + '">' +
                '<span class="bd-person-name">📌 ' + esc(s.title || s.slug) + '</span>' +
                (s.place ? '<span class="bd-person-role">' + esc(s.place) + '</span>' : '') + '</button>';
            }).join('') + '</div></div>');
        }
      }
    } catch (e) {}
    if (!parts.length) return '';
    return '<section class="bd-sec"><h3 class="bd-h">🔗 Related &amp; explore</h3>' + parts.join('') + '</section>';
  }

  // Apply a view filter to the topic ledger. Presentation only: it flips one
  // attribute that two display rules read, and it can reach nothing but the list
  // it was clicked inside. The rows are never rebuilt, so no slice can drop one.
  function setOmniView(btn) {
    var wrap = btn.closest ? btn.closest('.bd-omni-view') : null;
    if (!wrap) return;
    var view = btn.getAttribute('data-bd-view-set') || 'all';
    var list = wrap.querySelector('.bd-omni-list');
    if (list) list.setAttribute('data-bd-view', view);
    var btns = wrap.querySelectorAll('[data-bd-view-set]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-bd-view-set') === view));
    }
  }

  // The reader's slice of one roll call. Same shape as setOmniView above: the state
  // lives on the list as an attribute, the stylesheet does the hiding, and no row is
  // removed from the DOM — so clearing the filter is free and nothing on this face
  // is ever counted from what is currently on screen.
  function setRollView(btn) {
    var drop = btn.closest ? btn.closest('.bd-rollbody') : null;
    if (!drop) return;
    var view = btn.getAttribute('data-bd-roll-set') || 'all';
    var list = drop.querySelector('.bd-votes');
    if (list) list.setAttribute('data-bd-roll-view', view);
    var btns = drop.querySelectorAll('[data-bd-roll-set]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-bd-roll-set') === view));
    }
  }

  // Find a name in a roll call. A plain case-insensitive substring match against
  // the name we print, marking the rows that do not match — never deleting them,
  // and never claiming a count. An empty box means no search, so every row comes
  // back; a search that matches nothing says so rather than showing a blank list.
  function findInRoll(box) {
    var body = box.closest ? box.closest('.bd-rollbody') : null;
    if (!body) return;
    var q = String(box.value || '').trim().toLowerCase();
    var rows = body.querySelectorAll('.bd-vote-row');
    var hit = 0;
    for (var i = 0; i < rows.length; i++) {
      var nm = rows[i].querySelector('.bd-vote-name');
      var txt = (nm && (nm.textContent || '')).toLowerCase();
      var show = !q || txt.indexOf(q) !== -1;
      rows[i].classList.toggle('bd-vhide', !show);
      if (show) hit++;
    }
    var note = body.querySelector('.bd-rf-none');
    if (note) note.textContent = (q && !hit) ? 'No name on this roll call contains “' + box.value + '”.' : '';
  }

  // Open the Issue View / Spotlight for an issue key (with graceful fallbacks).
  // THE VOTE STRIP IS A DOOR, NOT A SUMMARY. Tapping a tally moves the reader to
  // the roll list in this same panel: the counts are the door's label and the names
  // are what is behind it. An in-panel scroll rather than a new view, because the
  // roll list is already on this face — there is nothing to load and nothing to
  // close. If the anchor is not on screen (a payload with no roll calls, a body the
  // panel has not filled yet) nothing happens, which is the honest outcome.
  function gotoSection(name, btn) {
    try {
      var host = document.getElementById('pdx-bd-scroll');
      var t = host && host.querySelector ? host.querySelector('[data-bd-anchor="' + name + '"]') : null;
      if (!t) return;
      // The strip's own label is "See who voted", so the tap that lands on the roll
      // list opens the names as well as scrolling to them. A closed drawer at the
      // end of that jump would be the door refusing to be a door. Only the strip's
      // own roll call opens — the other roll calls on a measure stay as they were.
      openRollDrop(t, btn && btn.getAttribute ? btn.getAttribute('data-bd-roll-open') : null);
      if (t.scrollIntoView) t.scrollIntoView({ block: 'start', behavior: 'smooth' });
      var h = t.querySelector ? t.querySelector('.bd-h') : null;
      if (h && h.focus) { h.setAttribute('tabindex', '-1'); h.focus(); }
    } catch (e) {}
  }

  function openRollDrop(sec, rcid) {
    try {
      var scope = null;
      if (rcid && sec.querySelector) scope = sec.querySelector('[data-bd-rc="' + rcid + '"]');
      var d = (scope || sec).querySelector ? (scope || sec).querySelector('.bd-rolldrop') : null;
      if (d) d.open = true;
    } catch (e) {}
  }

  function openIssue(key) {
    if (!key) return;
    try { if (window.PDXIssueView && window.PDXIssueView.open) { close(); window.PDXIssueView.open(key); return; } } catch (e) {}
    try { if (window.PDXDigitalLibrary && window.PDXDigitalLibrary.focus) { close(); window.PDXDigitalLibrary.focus({ mode: 'library', issue: key }); return; } } catch (e) {}
  }
  // Jump into the Legislation library filtered by an issue.
  function browseLegislation(key) {
    try { if (window.PDXDigitalLibrary && window.PDXDigitalLibrary.focus) { close(); window.PDXDigitalLibrary.focus({ mode: 'legislation', issue: key || '' }); return; } } catch (e) {}
  }

  // ── render ──────────────────────────────────────────────────────────────────
  // A compact "at a glance" strip of stat chips under the header — the shape of the
  // bill in one scannable row (how many issues it bundles, how much of a record it
  // has, where it stands). Purely presentational; everything is data already loaded.
  // ── THE LETTERHEAD ──────────────────────────────────────────────────────────
  // ONE ARCHIVE, THREE FACES. A person file opens with a brief: identity, one
  // teaching line, then doors. An issue face opens the same way. This is that same
  // opening for the third face — the measure — built from the payload this panel
  // already fetches. No second mapping engine, no new ingest, no LLM chapter: every
  // fact below is a row we hold, and every door leads to a face that already exists.
  //
  // The census, in the order a reader needs it:
  //   1. WHAT IT DID TO THE ARCHIVE — the teaching line. A measure gets one
  //      recorded vote, and that single Yea or Nay lands in full on every topic the
  //      act was mapped to. That is the whole doctrine of this panel in a sentence,
  //      so it is printed at the top rather than left to be inferred from a ledger
  //      further down.
  //   2. THE TOPIC TALLY — how many topics, how many were the bill's subject, how
  //      many rode inside. Subject and rode-inside are a LABEL on the bill so
  //      stowaways stay visible. They are not weights: the counts sit on one line
  //      and neither is drawn as the bigger number.
  //   3. THE CHIPS — one per mapped key, every one of them a door. A chip that
  //      cannot be tapped is a dead label, and a dead label is how a rider quietly
  //      stops counting. Each chip is paired with the shipped ⓘ scope control so a
  //      reader can ask what the key covers without leaving the page.
  //   4. THE VOTE STRIP — Yea / Nay / Present / Did not vote, and nothing else. No
  //      party column, no party breakdown, no percentage anywhere on this face. It
  //      taps through to the roll list, which is the only place names belong.
  // Where the record is thin the letterhead says which fact is missing. It never
  // fills a gap with a guess and never hides the gap to look complete.
  var VOTE_SLOTS = [
    ['yea', 'Yea'], ['nay', 'Nay'], ['present', 'Present'], ['notVoting', 'Did not vote']
  ];

  // ── IDENTITY SITS WITH THE TITLE ────────────────────────────────────────────
  // Which act is this? Number, official title, chamber and sitting, the dates we
  // hold, and the document the mapping was read from. Those five facts answer one
  // question, and a reader asks it before any other — so they are printed with the
  // title row and nowhere else on the face.
  //   They used to be spread across three places: a chamber-and-sitting line under
  // the title, a text link under the buttons, an identity table under the vote
  // strips, and the official title inside a fold. A reader who wanted to know what
  // they were looking at had to assemble it from four positions, and the page said
  // "House · 119th Congress" twice on the way. One block now, at the top.
  //   The official title is a sentence of legislative prose and is printed as one,
  // not squeezed into a cell — but it is identity, so it is here rather than folded
  // away, and it is only printed when it differs from the title we already show.
  function identityFacts(m, data) {
    var rows = [];
    rows.push(['Number', m.number || 'Not numbered in the record']);
    var official = officialTitleOf(m);
    if (official && official !== (m.title || '')) rows.push(['Official title', official]);
    var sit = sittingLabel(m);
    var where = [chamberLabel(m.chamber), sit].filter(Boolean).join(' \u00b7 ');
    if (where) rows.push([sit && chamberLabel(m.chamber) ? 'Chamber &amp; session' : 'Chamber', where]);
    var when = [];
    if (m.introducedAt) when.push('Introduced ' + fmtDate(m.introducedAt));
    var dd = decidedDate(data && data.rollcalls);
    if (dd) when.push('Voted ' + fmtDate(dd));
    rows.push(['Date', when.length ? when.join(' \u00b7 ') : 'No date is on file for this measure yet.']);
    var out = rows.map(function (r) {
      return '<div class="bd-ident-fact"><dt class="bd-ident-k">' + r[0] + '</dt>' +
        '<dd class="bd-ident-v">' + esc(r[1]) + '</dd></div>';
    }).join('');
    var txt = officialText(m);
    out += '<div class="bd-ident-fact"><dt class="bd-ident-k">Text</dt><dd class="bd-ident-v">' +
      (txt
        ? '<a class="bd-ident-text" href="' + escAttr(txt.url) + '" target="_blank" rel="noopener">\ud83d\udd17 ' + esc(txt.label) + ' \u2197</a>'
        : '<span class="bd-ident-gap">No link to the official text is on file for this measure yet.</span>') +
      '</dd></div>';
    return '<dl class="bd-ident">' + out + '</dl>';
  }

  function letterheadTopics(issues) {
    var ordered = bigPictureOrder(issues || []);
    if (!ordered.length) {
      return '<p class="bd-lh-gap">No topics are mapped to this measure yet, so a vote on it is not counted on any issue.</p>';
    }
    var subj = 0;
    ordered.forEach(function (it) { if (it.isPrimary) subj++; });
    var rode = ordered.length - subj;
    var tally = ordered.length + ' topic' + (ordered.length !== 1 ? 's' : '') + ' mapped' +
      ' · ' + subj + ' this bill’s subject' +
      ' · ' + rode + ' rode inside';
    var chips = ordered.map(function (it) {
      var lane = it.isPrimary ? 'this bill’s subject' : 'rode inside';
      // The chip is the door; the ⓘ is its sibling, never its child.
      return '<span class="bd-lh-chipw">' +
        '<button type="button" class="bd-lh-chip" data-issue="' + escAttr(it.issueKey) + '"' +
          issueTint(it.issueKey) +
          ' title="' + escAttr('Open the ' + issueLabel(it.issueKey) + ' face') + '">' +
          '<span class="bd-lh-chip-l">' + esc(issueLabel(it.issueKey)) + '</span>' +
          '<span class="bd-lh-chip-lane">' + esc(lane) + '</span>' +
        '</button>' + scopeControlHtml(it.issueKey) +
      '</span>';
    }).join('');
    // Counted on the SCRUBBED sentence, not the raw field. A rationale that is
    // nothing but curator notes leaves the row below with nothing to print, and a
    // tally that called it explained would be promising a sentence the reader will
    // never find.
    var unreasoned = ordered.filter(function (it) { return !scopeSentence(it); }).length;
    var gap = unreasoned
      ? '<p class="bd-lh-gap">' + (unreasoned === ordered.length
            ? 'No mapping rationale is on file yet'
            : unreasoned + ' of these topics ' + (unreasoned === 1 ? 'carries' : 'carry') + ' no mapping rationale yet') +
        ', so this profile cannot yet say in words what the act did on ' +
        (unreasoned === 1 ? 'it' : 'them') + '. The vote still counts in full.</p>'
      : '';
    return '<p class="bd-lh-tally">' + esc(tally) + '</p>' +
      '<div class="bd-lh-chips">' + chips + '</div>' + gap;
  }

  function letterheadVotes(rollcalls) {
    var rcs = (rollcalls || []);
    if (!rcs.length) {
      return '<p class="bd-lh-gap">No recorded vote is on file for this measure yet — it may have died in committee, or the tally may not have reached us.</p>';
    }
    var blocks = rcs.map(function (rc) {
      var t = rc.totals || {};
      var cells = VOTE_SLOTS.map(function (sl) {
        if (t[sl[0]] == null) return '';
        return '<span class="bd-lh-vc bd-lh-vc-' + sl[0] + '"><b>' + esc(String(t[sl[0]])) + '</b> ' + sl[1] + '</span>';
      }).filter(Boolean).join('');
      var meta = [chamberLabel(rc.chamber), fmtDate(rc.voteDate), rc.result ? statusLabelResult(rc.result) : '']
        .filter(Boolean).join(' · ');
      return '<button type="button" class="bd-lh-strip" data-bd-goto="rolls"' +
          (rc.id != null ? ' data-bd-roll-open="' + escAttr(String(rc.id)) + '"' : '') +
          ' title="Go to the roll list for this vote">' +
        '<span class="bd-lh-vq">' + esc(rc.question || 'Vote') + '</span>' +
        '<span class="bd-lh-vm">' + esc(meta) + '</span>' +
        (cells ? '<span class="bd-lh-vcs">' + cells + '</span>'
               : '<span class="bd-lh-gap">Totals are not in the record for this roll call.</span>') +
        '<span class="bd-lh-vgo">See who voted →</span>' +
      '</button>';
    }).join('');
    return blocks;
  }

  // ── ONE TEACHING LINE, TWO FACTS ────────────────────────────────────────────
  // The doctrine of this archive is two sentences long: one recorded vote counts
  // in full on every topic it was mapped to, and the topics moved as one
  // instrument so nobody got to vote on them singly. Those two facts used to be
  // printed a screen apart \u2014 the first here, the second in a panel of its own
  // below the ledger \u2014 which read as the page explaining itself twice. They are
  // one line now, in the position the first one already held. The packaging half
  // only prints where there is packaging to describe: a measure mapped to one
  // topic is not a bag, and saying so about a bag of one is noise.
  function letterheadTeach(m, issues, rollcalls) {
    var rcs = (rollcalls || []).length;
    var votes = rcs === 1
      ? 'One recorded vote. It counts on every topic below.'
      : rcs > 1
        ? rcs + ' recorded votes. Each one counts in full on every topic below.'
        : 'No recorded vote on file. The topics below are what this act was mapped to, not how anyone voted on it.';
    if (!issues || issues.length < 2) return votes;
    var carried = rcs === 1
      ? 'One roll call decided every one of them: a member could take the whole bill or refuse the whole bill, and there was no separate vote on any single topic in it.'
      : rcs > 1
        ? 'Each of those roll calls decided every one of them at once. None of them was a vote on one topic.'
        : (m && m.status === 'enacted')
          ? 'They were signed into law as one instrument, so they arrived together or not at all.'
          : 'They ride on one measure, so they move together for as long as it does.';
    return votes + ' ' + carried;
  }

  function letterheadHtml(m, issues, data) {
    var rcs = (data && data.rollcalls) || [];
    // ONE TOPIC SURFACE. The teaching line, the tally, the chips and the vote
    // strips. Identity has gone up to the title row, where a reader looks for it
    // first; nothing else has been added in its place, because the point of the
    // move was a shorter panel and not a differently-filled one.
    return '<section class="bd-sec bd-lh" aria-label="Bill profile">' +
      '<p class="bd-lh-teach">' + esc(letterheadTeach(m, issues, rcs)) + '</p>' +
      letterheadTopics(issues) +
      '<div class="bd-lh-votes">' + letterheadVotes(rcs) + '</div>' +
    '</section>';
  }

  // ── THE PROSE IS A FOOTNOTE, NOT THE GATEWAY ────────────────────────────────
  // The ingested summary of a big act runs to thousands of characters of
  // section-by-section legislative description. That text is worth keeping — it is
  // the only place a reader can find out what Title VII actually said — but it is
  // not what a cold reader needs in the first screen, and while it sat above the
  // letterhead it pushed the chips and the vote strips off the fold entirely.
  //   So it folds. A native <details>, closed by default, under the census:
  //     · NOTHING IS SUMMARISED, REWRITTEN OR TRIMMED. The whole shipped summary
  //       goes in verbatim. No model touches this text; if we have 2,500 characters
  //       of it, all 2,500 are in the DOM behind one tap.
  //     · The OFFICIAL TITLE leads the panel, because "To increase the supply of
  //       housing in America, and for other purposes." is prose of exactly this
  //       kind and reads as the summary's first line rather than a table row.
  //     · <details> and not a CSS-hidden div, so the fold works with no JS, the
  //       text stays findable by the browser's own find-in-page once opened, and
  //       assistive tech gets a real disclosure widget instead of a mystery box.
  //   When we hold neither an official title nor a summary the fold does not
  // render at all. An empty disclosure that promises contents and delivers none is
  // worse than an honest absence.
  function foldSection(m) {
    // The official title no longer leads this panel: it is one of the five facts
    // that say which act this is, so it went up to the identity block beside the
    // title where a reader looks for it. What is left behind the fold is the one
    // thing that genuinely is a footnote — the ingested section-by-section
    // description, whole and verbatim. With no description on file there is nothing
    // to disclose and no fold is drawn.
    var summary = m.summary ? String(m.summary) : '';
    if (!summary) return '';
    var label = 'What’s in this act';
    var hint = 'the full description on file';
    var body = '<p class="bd-fold-body">' + esc(summary) + '</p>';
    return '<section class="bd-sec bd-foldsec">' +
      '<details class="bd-fold">' +
        '<summary class="bd-fold-sum">' +
          '<span class="bd-fold-t">📄 ' + esc(label) + '</span>' +
          '<span class="bd-fold-h">' + esc(hint) + '</span>' +
        '</summary>' +
        '<div class="bd-fold-in">' + body + '</div>' +
      '</details>' +
    '</section>';
  }

  function glanceStrip(m, issues, data) {
    var chips = [];
    if (issues && issues.length >= 2) chips.push('<span class="bd-glance bd-glance-omni">📦 ' + issues.length + ' issues bundled</span>');
    var rcs = (data.rollcalls || []);
    if (rcs.length) chips.push('<span class="bd-glance">🗳️ ' + rcs.length + ' roll call' + (rcs.length !== 1 ? 's' : '') + '</span>');
    var votes = 0; rcs.forEach(function (r) { votes += (r.votes || []).length; });
    if (votes) chips.push('<span class="bd-glance">👥 ' + votes + ' recorded votes</span>');
    var prov = (data.provisions || []).length;
    if (prov) chips.push('<span class="bd-glance">🧩 ' + prov + ' key provision' + (prov !== 1 ? 's' : '') + '</span>');
    var allPos = (data.positions || []);
    var execPos = allPos.filter(isExecAction);
    var pos = allPos.length - execPos.length;
    if (pos) chips.push('<span class="bd-glance">👤 ' + pos + ' member action' + (pos !== 1 ? 's' : '') + '</span>');
    // Counted apart from member actions on purpose: signing or issuing is a formal
    // executive act, not a member action, and the two units are never summed.
    if (execPos.length) chips.push('<span class="bd-glance">✒️ ' + execPos.length + ' executive action' + (execPos.length !== 1 ? 's' : '') + '</span>');
    // Axis B, at a glance: if anything on this measure is contested, say so here
    // rather than only deep in the executive section. A reader who scans the strip
    // and sees nothing takes the measure as settled.
    var contested = 0;
    (data.positions || []).forEach(function (p) {
      var cur = p && p.standingCurrent;
      var meta = cur ? standingMeta(cur.status) : null;
      if (meta && meta.contested) contested++;
    });
    if (contested) chips.push('<span class="bd-glance bd-glance-contested">⚖ ' + contested + ' contested in court</span>');
    if (m.status) chips.push('<span class="bd-glance">🚦 ' + esc(statusLabel(m.status)) + '</span>');
    return chips.length ? '<div class="bd-glance-row">' + chips.join('') + '</div>' : '';
  }

  function bodyHtml(data) {
    var m = data.measure || {};
    var issues = data.issues || [];
    _current = {
      id: (m.id != null) ? m.id : null, number: m.number || '', congress: m.congress || '',
      // The sitting a shared address needs: a congress for a federal row, the
      // recorded session code for a state one whose congress column is NULL.
      sitting: sittingKey(m),
      title: m.shortTitle || m.title || m.number || 'Bill', status: m.status || '', chamber: m.chamber || '',
      source: m.source || null
    };
    var status = m.status ? '<span class="bd-status bd-s-' + esc(m.status) + '">' + esc(statusLabel(m.status)) + '</span>' : '';
    var omni = issues.length >= 2 ? '<span class="bd-omnibadge">📦 Omnibus · ' + issues.length + ' issues</span>' : '';
    // The chamber-and-sitting line and the link to the official record used to be
    // built here as well. Both are identity, both are now rows of the identity
    // block below the title, and printing them twice is what made the header read
    // as a page clearing its throat.
    var following = false;
    try { following = !!(G('PDXBills') && G('PDXBills').isFollowed && G('PDXBills').isFollowed(_current)); } catch (e) {}
    var actionsBar =
      '<div class="bd-actions">' +
        '<button type="button" class="bd-btn bd-follow' + (following ? ' is-on' : '') + '" data-bd-follow aria-pressed="' + following + '">' +
          (following ? '★ Following' : '☆ Follow this bill') + '</button>' +
        '<button type="button" class="bd-btn bd-share" data-bd-share>🔗 Share</button>' +
      '</div>';
    return '<div class="bd-head">' +
        '<div class="bd-head-top"><span class="bd-num">' + esc(m.number || 'Measure') + '</span>' + status + omni + '</div>' +
        '<h2 class="bd-title">' + esc(m.title || '') + '</h2>' +
        identityFacts(m, data) +
        actionsBar +
      '</div>' +
      letterheadHtml(m, issues, data) +
      foldSection(m) +
      glanceStrip(m, issues, data) +
      omnibusSection(m, issues) +
      provisionsSection(m, data.provisions) +
      impactLedgerSection(data) +
      rollcallsSection(m, issues, data.rollcalls) +
      sponsorsSection(m, data.positions) +
      execActionsSection(m, data.positions) +
      memberActionsSection(m, data.positions) +
      timelineSection(m, data.rollcalls, data.actions) +
      relatedSection(m, issues);
  }

  function ensureOverlay() {
    var ov = document.getElementById('pdx-bd-overlay');
    if (ov) return ov;
    injectCss();
    ov = document.createElement('div');
    ov.id = 'pdx-bd-overlay';
    ov.className = 'bd-overlay';
    ov.hidden = true;
    ov.innerHTML =
      '<div class="bd-backdrop" data-bd-close></div>' +
      '<div class="bd-panel" role="dialog" aria-modal="true" aria-label="Bill detail">' +
        '<button type="button" class="bd-close" data-bd-close aria-label="Close">×</button>' +
        '<div class="bd-scroll" id="pdx-bd-scroll"></div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target && e.target.hasAttribute('data-bd-close')) close(); });
    // Delegated actions: open a profile or a spotlight from inside the panel.
    ov.addEventListener('click', function (e) {
      var pb = e.target.closest ? e.target.closest('[data-pid]') : null;
      if (pb) { var pid = pb.getAttribute('data-pid'); if (pid && typeof window.showProfile === 'function') { close(); window.showProfile(pid); } return; }
      var sb = e.target.closest ? e.target.closest('[data-slug]') : null;
      if (sb) { var slug = sb.getAttribute('data-slug'); if (slug && window.PDXSpotlight && window.PDXSpotlight.open) { close(); window.PDXSpotlight.open(slug); } return; }
      var ib = e.target.closest ? e.target.closest('[data-bd-view-set]') : null;
      if (ib) { setOmniView(ib); return; }
      var rf = e.target.closest ? e.target.closest('[data-bd-roll-set]') : null;
      if (rf) { setRollView(rf); return; }
      var gb = e.target.closest ? e.target.closest('[data-bd-goto]') : null;
      if (gb) { gotoSection(gb.getAttribute('data-bd-goto'), gb); return; }
      ib = e.target.closest ? e.target.closest('[data-issue]') : null;
      if (ib) { openIssue(ib.getAttribute('data-issue')); return; }
      var lb = e.target.closest ? e.target.closest('[data-legis]') : null;
      if (lb) { browseLegislation(lb.getAttribute('data-legis')); return; }
      var eb = e.target.closest ? e.target.closest('[data-eye]') : null;
      if (eb) {
        var num = eb.getAttribute('data-eye');
        close();
        if (window.PDXEye && typeof window.PDXEye.search === 'function') window.PDXEye.search(num);
        else if (window.PDXEye && typeof window.PDXEye.focus === 'function') window.PDXEye.focus();
        return;
      }
      var fb = e.target.closest ? e.target.closest('[data-bd-follow]') : null;
      if (fb) { toggleFollow(fb); return; }
      var shb = e.target.closest ? e.target.closest('[data-bd-share]') : null;
      if (shb) { share(shb); return; }
    });
    // Typing in a roll call's find box. Delegated like every other control on this
    // panel, so it survives the body being re-rendered under it.
    ov.addEventListener('input', function (e) {
      var box = e.target && e.target.hasAttribute && e.target.hasAttribute('data-bd-roll-find') ? e.target : null;
      if (box) findInRoll(box);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden) close(); });
    return ov;
  }

  // Toggle follow for the bill on screen and reflect it on the button.
  function toggleFollow(btn) {
    var bills = G('PDXBills');
    if (!bills || !bills.toggleFollow || !_current) return;
    var on = bills.toggleFollow(_current);
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = on ? '★ Following' : '☆ Follow this bill';
  }

  // A stable, shareable deep link to this bill (congress + number).
  //
  // The panel still RUNS on `#bill/<congress>/<number>` — every link already out
  // there keeps working — but a hash never reaches a server, so a pasted hash link
  // could only ever unfurl as the generic site card. What leaves the device is the
  // query form (`/?bill=119/H.R. 1`), which the edge can read and preview and
  // share-links.js converts straight back into the same hash on arrival.
  function shareUrl() {
    if (!_current) return location.href;
    var links = G('PDXShareLinks');
    if (links && links.bill) return links.bill(_current.sitting || _current.congress, _current.number);
    return location.origin + location.pathname +
      '#bill/' + encodeURIComponent(_current.sitting || _current.congress || '') + '/' + encodeURIComponent(_current.number || '');
  }
  // Reflect the open bill in the URL without triggering the hashchange handler
  // (history.replaceState does not fire hashchange), so a shared/refreshed link
  // reopens the panel while ordinary opens stay loop-free.
  function syncHash() {
    if (!_current) return;
    try {
      var h = '#bill/' + encodeURIComponent(_current.sitting || _current.congress || '') + '/' + encodeURIComponent(_current.number || '');
      if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h);
    } catch (e) {}
  }
  function clearHash() {
    try { if (/^#bill\//.test(location.hash || '')) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  // Share the bill: use the native share sheet on touch devices, and fall back to
  // copying the deep link to the clipboard (with a prompt of last resort).
  function share(btn) {
    if (!_current) return;
    var url = shareUrl();
    var title = _current.number ? (_current.number + ' — ' + _current.title) : (_current.title || 'Bill');
    var coarse = false;
    try { coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches; } catch (e) {}
    var copy = function () {
      var done = function () { var t = btn.innerHTML; btn.innerHTML = '✓ Link copied'; setTimeout(function () { btn.innerHTML = t; }, 1600); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link', url); }); return; }
      } catch (e) {}
      window.prompt('Copy this link', url);
    };
    // A refused share used to be indistinguishable from a completed one, because
    // the rejection was swallowed and the copy fallback was already unreachable
    // behind the early return. Now the outcome decides.
    var L = null;
    try { L = window.PDXShareLinks; } catch (e) { L = null; }
    if (coarse && L && typeof L.native === 'function') {
      L.native({ title: title, text: title, url: url }).then(function (res) {
        if (res.ok || res.outcome === 'cancelled') return;
        copy();
      });
      return;
    }
    if (navigator.share && coarse) {
      try { navigator.share({ title: title, text: title, url: url }).catch(copy); return; }
      catch (e) {}
    }
    copy();
  }

  function show(html) {
    var ov = ensureOverlay();
    var scroll = document.getElementById('pdx-bd-scroll');
    if (scroll) { scroll.innerHTML = html; scroll.scrollTop = 0; }
    ov.hidden = false;
    document.documentElement.classList.add('bd-lock');
  }
  function close() {
    var ov = document.getElementById('pdx-bd-overlay');
    if (ov) ov.hidden = true;
    document.documentElement.classList.remove('bd-lock');
    clearHash();
  }

  function renderLoading() { show('<div class="bd-loading"><span class="bd-spin"></span> Loading bill…</div>'); }
  function renderError(card) {
    var src = card && card.source && card.source.url;
    show('<div class="bd-loading">Could not load this bill right now.' +
      (src ? ' <a class="bd-src" href="' + escAttr(src) + '" target="_blank" rel="noopener">Open the official record →</a>' : '') + '</div>');
  }

  // Minimal _current from a card, so follow / share / deep-link keep working in the
  // lite fallback below.
  function liteCurrent(card) {
    return {
      id: (card && card.id != null) ? card.id : null, number: (card && card.number) || '',
      congress: (card && card.congress) || '', title: (card && (card.shortTitle || card.title || card.number)) || 'Bill',
      status: (card && card.status) || '', chamber: (card && card.chamber) || '', source: (card && card.source) || null
    };
  }
  // Fallback detail rendered entirely from the card we already have — used whenever
  // the live measure (roll calls, sponsors, timeline) can't be fetched: the Voting
  // Record API is momentarily unavailable, or the card came from the inline light
  // index (which carries no DB id to resolve). A click then always opens something
  // useful and fully sourced — the header, summary, the issue breakdown (each issue
  // links to its Spotlight) and the official record — instead of a dead end.
  function liteBodyHtml(card) {
    var status = card.status ? '<span class="bd-status bd-s-' + esc(card.status) + '">' + esc(statusLabel(card.status)) + '</span>' : '';
    // THE FALLBACK IS NOT A LESSER LEDGER. This body renders when the live measure
    // cannot be fetched, and it used to put `primaryIssue` at the head of the chip
    // row — the same crowning the live path stopped doing, surviving in the path a
    // reader only ever meets when something is already broken. The flag still
    // decides MEMBERSHIP (the light index sometimes names a primary the issueKeys
    // array omits, and dropping it would lose a topic), but not position.
    var keys = (card.issueKeys || []).filter(Boolean);
    if (card.primaryIssue && keys.indexOf(card.primaryIssue) < 0) keys = keys.concat([card.primaryIssue]);
    var ordered = bigPictureKeys(keys);
    var omni = ordered.length >= 2 ? '<span class="bd-omnibadge">📦 ' + ordered.length + ' issues</span>' : '';
    var meta = [chamberLabel(card.chamber), card.congress ? (card.congress + 'th Congress') : ''].filter(Boolean).join(' · ');
    var src = (card.source && card.source.url)
      ? '<a class="bd-src bd-src-top" href="' + escAttr(card.source.url) + '" target="_blank" rel="noopener">🔗 ' + esc((card.source && card.source.label) || 'Official record') + '</a>' : '';
    var chips = ordered.map(function (k) {
      return '<button type="button" class="bd-omni-issue bd-omni-link" data-issue="' + escAttr(k) + '" title="See the ' + escAttr(issueLabel(k)) + ' spotlight">' + esc(issueLabel(k)) + '</button>';
    }).join('');
    var breakdown = ordered.length
      ? '<section class="bd-sec"><h3 class="bd-h">📦 What’s inside this vote</h3>' +
          '<p class="bd-lead">' + (ordered.length >= 2
            ? 'This bill bundles <strong>' + ordered.length + ' issues</strong> into one vote — open any Spotlight to see where people stand.'
            : 'Open the Spotlight to see where people stand.') + '</p>' +
          '<div class="bd-lite-chips">' + chips + '</div></section>'
      : '';
    return '<div class="bd-head">' +
        '<div class="bd-head-top"><span class="bd-num">' + esc(card.number || 'Measure') + '</span>' + status + omni + '</div>' +
        '<h2 class="bd-title">' + esc(card.title || card.shortTitle || '') + '</h2>' +
        (meta ? '<div class="bd-meta">' + esc(meta) + '</div>' : '') +
        (card.summary ? '<p class="bd-summary">' + esc(card.summary) + '</p>' : '') +
        src +
      '</div>' +
      breakdown +
      '<section class="bd-sec"><p class="bd-empty">Live roll-call votes and sponsors aren’t available right now. ' +
        (card.source && card.source.url ? 'Open the official record above for the full text.' : 'Please try again in a moment.') + '</p></section>';
  }
  // Show the lite panel for a card (sets _current + hash). Returns true when it could.
  function showLite(card) {
    if (!card) return false;
    _current = liteCurrent(card);
    show(liteBodyHtml(card));
    syncHash();
    return true;
  }

  // Resolve a card ref (numeric id, or a bill number like "H.R. 1") to a measure id,
  // then fetch + render. Falls back to a card-only lite panel whenever the live detail
  // can't be loaded, so a click never dead-ends.
  function open(ref, sitting) {
    var bills = G('PDXBills');
    var inlineCard = (bills && bills.listSync) ? findByNumber(bills.listSync().items, ref) : null;
    if (!bills || typeof bills.get !== 'function') { // no client module → best-effort
      if (showLite(inlineCard)) return true;
      if (inlineCard && inlineCard.source && inlineCard.source.url) window.open(inlineCard.source.url, '_blank', 'noopener');
      return false;
    }
    renderLoading();
    resolveId(ref, bills, sitting).then(function (id) {
      var card = inlineCard || findByNumber((bills.listSync ? bills.listSync().items : []), ref);
      if (id == null) { if (!showLite(card)) renderError(card); return; }
      bills.get(id).then(function (data) {
        if (data && data.measure) { show(bodyHtml(data)); syncHash(); }
        else if (!showLite(card)) renderError(null);
      }).catch(function () { if (!showLite(card)) renderError(card); });
    }).catch(function () { if (!showLite(inlineCard)) renderError(inlineCard); });
    return true;
  }

  function findByNumber(items, ref) {
    if (!items) return null;
    for (var i = 0; i < items.length; i++) { if (items[i] && (String(items[i].id) === String(ref) || items[i].number === ref)) return items[i]; }
    return null;
  }
  // ONE PANEL, ANY REF. A ref reaches this panel from five places — an index card,
  // the HR1 showcase, the library, a person file's measure row and a shared address
  // — and it arrives as either a measure id or a printed number. The number path
  // used to look only at the first page of /measures, which quietly meant: bills
  // ranked past the hundredth, and every state bill in a chamber the default page
  // does not lead with, had a number that resolved to nothing. So the list is asked
  // properly — `q` is the API's own number/title search — and the page-one lookup
  // stays as the offline-friendly first guess.
  function resolveId(ref, bills, sitting) {
    if (/^\d+$/.test(String(ref))) return Promise.resolve(parseInt(ref, 10));
    var want = String(ref || '');
    var pick = function (items) {
      var hits = (items || []).filter(function (it) { return it && it.number === want; });
      var sited = hits.filter(function (it) { return sittingMatch(it, sitting); });
      var c = (sited[0] || (sitting ? null : hits[0]));
      return c && c.id != null ? c.id : null;
    };
    return bills.list({ pageSize: 100 }).then(function (d) {
      var id = pick(d && d.items);
      if (id != null) return id;
      return bills.list({ q: want, pageSize: 50 }).then(function (d2) {
        return pick(d2 && d2.items);
      }).catch(function () { return null; });
    }).catch(function () { return null; });
  }

  function injectCss() {
    if (document.getElementById('bd-css')) return;
    var css =
      'html.bd-lock{overflow:hidden;}' +
      '.bd-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-start;justify-content:center;}' +
      '.bd-overlay[hidden]{display:none;}' +
      '.bd-backdrop{position:absolute;inset:0;background:rgba(3,6,15,.72);backdrop-filter:blur(3px);}' +
      '.bd-panel{position:relative;z-index:1;width:min(56rem,94vw);max-height:92vh;margin:4vh auto;display:flex;flex-direction:column;' +
        'background:linear-gradient(180deg,#0d1526,#0a0f1e);border:1px solid rgba(159,180,212,.2);border-radius:1rem;box-shadow:0 30px 80px rgba(0,0,0,.6);}' +
      '.bd-close{position:absolute;top:.5rem;right:.6rem;z-index:2;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);' +
        'color:#cbd9ec;font-size:1.3rem;line-height:1;cursor:pointer;border-radius:.5rem;width:2rem;height:2rem;}' +
      '.bd-close:hover{background:rgba(255,255,255,.14);color:#fff;}' +
      '.bd-scroll{overflow-y:auto;padding:1.4rem 1.5rem 2rem;}' +
      '.bd-loading{padding:3rem 1rem;text-align:center;color:#9fb4d4;font:500 .95rem/1.5 "Barlow",sans-serif;}' +
      '.bd-spin{display:inline-block;width:1rem;height:1rem;border:2px solid rgba(159,180,212,.3);border-top-color:#7fb4ff;border-radius:50%;animation:bd-spin .7s linear infinite;vertical-align:-2px;}' +
      '@keyframes bd-spin{to{transform:rotate(360deg);}}' +
      '.bd-head{border-bottom:1px solid rgba(159,180,212,.14);padding-bottom:1rem;margin-bottom:.3rem;}' +
      '.bd-head-top{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-bottom:.4rem;}' +
      '.bd-num{font:800 .78rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#9ff0bd;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.35);border-radius:.4rem;padding:.28rem .55rem;}' +
      '.bd-status{font:800 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;border-radius:.4rem;padding:.26rem .5rem;color:#9ff0bd;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.3);}' +
      '.bd-s-failed,.bd-s-vetoed{color:#fca5a5;background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.35);}' +
      '.bd-s-introduced,.bd-s-pending{color:#cbd9ec;background:rgba(159,180,212,.1);border-color:rgba(159,180,212,.28);}' +
      '.bd-omnibadge{font:700 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#f6d873;background:rgba(245,200,66,.12);border:1px solid rgba(245,200,66,.35);border-radius:999px;padding:.24rem .5rem;}' +
      '.bd-title{font:800 clamp(1.3rem,3.4vw,1.9rem)/1.12 "Bebas Neue","Barlow Condensed",sans-serif;letter-spacing:.02em;color:#fff;margin:.15rem 0 .35rem;}' +
      '.bd-meta{font:600 .72rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-summary{font:500 .92rem/1.55 "Barlow",sans-serif;color:#b9c8e0;margin:.6rem 0 .5rem;}' +
      '.bd-src{display:inline-block;font:600 .78rem/1.3 "Barlow",sans-serif;color:#7fb4ff;text-decoration:none;}' +
      '.bd-src:hover{text-decoration:underline;}' +
      '.bd-src-top{margin-top:.3rem;}' +
      '.bd-sec{margin-top:1.5rem;}' +
      // ── the letterhead ────────────────────────────────────────────────────
      // Flat, quiet, and above the fold: a census reads better as a list of facts
      // than as a card. Nothing here is a percentage and nothing here is a bar,
      // because a measure's topics are a set and not a distribution.
      '.bd-lh{margin-top:1rem;padding:.85rem .9rem;border:1px solid rgba(159,180,212,.16);border-radius:.7rem;background:rgba(255,255,255,.02);}' +
      // Identity, in the header, under the title. A two-column grid so the labels
      // form a readable spine and the whole block stays about as tall as the three
      // separate lines it replaced — the point of the move was to stop the page
      // repeating itself, not to spend the space saved on the same facts.
      '.bd-ident{display:grid;grid-template-columns:auto 1fr;gap:.24rem .7rem;margin:.45rem 0 .1rem;}' +
      '.bd-ident-fact{display:contents;}' +
      '.bd-ident-k{font:700 .62rem/1.5 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8aa0c4;margin:0;}' +
      '.bd-ident-v{font:500 .84rem/1.45 "Barlow",sans-serif;color:#dce6f7;margin:0;}' +
      '.bd-ident-text{color:#7fb4ff;text-decoration:none;}' +
      '.bd-ident-text:hover{text-decoration:underline;}' +
      '.bd-ident-gap{color:#9fb4d4;font-style:italic;}' +
      '.bd-lh-gap{font:500 .8rem/1.45 "Barlow",sans-serif;color:#8aa0c4;font-style:italic;}' +
      '.bd-lh-teach{font:700 .9rem/1.4 "Barlow",sans-serif;color:#f3d774;margin:.2rem 0 .6rem;}' +
      '.bd-lh-tally{font:700 .68rem/1.4 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#bcd0f0;margin:0 0 .45rem;}' +
      '.bd-lh-chips{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.7rem;}' +
      '.bd-lh-chipw{display:inline-flex;align-items:center;gap:.18rem;}' +
      '.bd-lh-chip{display:inline-flex;flex-direction:column;align-items:flex-start;gap:.08rem;cursor:pointer;text-align:left;background:rgba(96,165,250,.1);border:1px solid rgba(126,180,255,.32);border-radius:.5rem;padding:.3rem .55rem;}' +
      '.bd-lh-chip:hover{background:rgba(96,165,250,.2);border-color:#9ec8ff;}' +
      '.bd-lh-chip-l{font:700 .8rem/1.15 "Barlow Condensed",sans-serif;color:#e6eefc;}' +
      '.bd-lh-chip-lane{font:600 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#9fb4d4;}' +
      // THE SAME COLOUR THIS TOPIC HAS EVERYWHERE ELSE. issue-colors.js hands the
      // chip its four tokens inline (see issueTint) and these rules spend them the
      // way the stance tree and the compare surfaces already do: `soft` for the
      // fill, the full colour for the edge and the focus ring, `ink` for the label.
      // A chip with no tokens — no issue-colors.js on the page — keeps the house
      // blue above, because the fallbacks in every var() below are the old values.
      //   The LANE LABEL IS NOT TINTED. Provenance is a word, not a hue: two chips
      // of one colour and different lanes is the correct rendering of a rider.
      '.bd-lh-chip[data-ic]{background:var(--pdx-ic-soft,rgba(96,165,250,.1));border-color:var(--pdx-ic,rgba(126,180,255,.32));}' +
      '.bd-lh-chip[data-ic] .bd-lh-chip-l{color:var(--pdx-ic-ink,#e6eefc);}' +
      '.bd-lh-chip[data-ic]:hover{background:var(--pdx-ic-wash,rgba(96,165,250,.2));border-color:var(--pdx-ic,#9ec8ff);}' +
      '.bd-lh-chip[data-ic]:focus-visible{outline:2px solid var(--pdx-ic,#7fb4ff);outline-offset:2px;}' +
      '.bd-lh-votes{display:flex;flex-direction:column;gap:.4rem;}' +
      '.bd-lh-strip{display:flex;flex-direction:column;align-items:flex-start;gap:.22rem;width:100%;cursor:pointer;text-align:left;background:rgba(159,180,212,.06);border:1px solid rgba(159,180,212,.2);border-radius:.55rem;padding:.5rem .6rem;}' +
      '.bd-lh-strip:hover{background:rgba(159,180,212,.12);border-color:rgba(126,180,255,.5);}' +
      '.bd-lh-vq{font:700 .82rem/1.25 "Barlow Condensed",sans-serif;color:#e6eefc;}' +
      '.bd-lh-vm{font:600 .62rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-lh-vcs{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.1rem;}' +
      '.bd-lh-vc{font:600 .68rem/1 "Barlow",sans-serif;color:#cbd9ec;background:rgba(159,180,212,.1);border:1px solid rgba(159,180,212,.2);border-radius:.35rem;padding:.24rem .45rem;}' +
      '.bd-lh-vc b{font:700 .78rem/1 "Barlow Condensed",sans-serif;color:#fff;}' +
      '.bd-lh-vc-yea{color:#a7e8b6;background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.28);}' +
      '.bd-lh-vc-nay{color:#f6b8b0;background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.28);}' +
      '.bd-lh-vgo{font:700 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#7fb4ff;}' +
      '.bd-omni-lane-l{font:600 .6rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#9fb4d4;background:rgba(159,180,212,.1);border:1px solid rgba(159,180,212,.2);border-radius:.3rem;padding:.2rem .4rem;}' +
      '.bd-h{font:700 1rem/1.1 "Barlow Condensed",sans-serif;letter-spacing:.03em;text-transform:uppercase;color:#fff;margin:0 0 .6rem;}' +
      '.bd-lead{font:500 .86rem/1.5 "Barlow",sans-serif;color:#9fb4d4;margin:0 0 .8rem;}' +
      '.bd-empty,.bd-note{font:500 .82rem/1.5 "Barlow",sans-serif;color:#8aa0c4;}' +
      '.bd-omni-row{border:1px solid rgba(159,180,212,.12);border-left:3px solid rgba(96,165,250,.5);border-radius:.6rem;padding:.6rem .7rem;margin-bottom:.5rem;background:rgba(255,255,255,.02);}' +
      '.bd-omni-opp{border-left-color:rgba(251,146,60,.55);}' +
      '.bd-omni-head{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;}' +
      '.bd-omni-issue{font:700 .9rem/1.2 "Barlow Condensed",sans-serif;color:#e6eefc;}' +
      '.bd-omni-link{background:none;border:0;padding:0;cursor:pointer;text-align:left;text-decoration:underline;text-decoration-color:rgba(126,180,255,.35);text-underline-offset:2px;}' +
      '.bd-omni-link:hover{color:#9ec8ff;text-decoration-color:#9ec8ff;}' +
      '.bd-lite-chips{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.3rem;}' +
      '.bd-glance-row{display:flex;flex-wrap:wrap;gap:.4rem;margin:.1rem 0 1.1rem;}' +
      '.bd-glance{display:inline-flex;align-items:center;gap:.3rem;font:700 .64rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#bcd0f0;background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.2);border-radius:999px;padding:.32rem .62rem;}' +
      '.bd-glance-omni{color:#f6d873;background:rgba(245,200,66,.12);border-color:rgba(245,200,66,.38);}' +
      '.bd-issuejump .bd-person-name{color:#9ec8ff;}' +
      '.bd-legis{margin-top:.6rem;display:inline-block;}' +
      '.bd-eye{margin-top:.2rem;display:inline-block;}' +
      '.bd-viewfilter{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;margin:-.2rem 0 .7rem;}' +
      '.bd-vf-lab{font:800 .56rem/1 "Barlow Condensed",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#7f93b4;margin-right:.15rem;}' +
      '.bd-vf-btn{font:600 .66rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.02em;color:#bcd0f0;background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.22);border-radius:999px;padding:.3rem .6rem;cursor:pointer;}' +
      '.bd-vf-btn:hover{color:#e6eefc;border-color:rgba(159,180,212,.4);}' +
      '.bd-vf-btn[aria-pressed="true"]{color:#0a0f1e;background:#9ec8ff;border-color:#9ec8ff;font-weight:800;}' +
      '.bd-vf-btn:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}' +
      // The whole filter, in two rules. "all" matches neither, which is why the
      // default state shows every row and why a missing/unknown value does too.
      '.bd-omni-list[data-bd-view="main"] .bd-omni-row[data-bd-lane="other"]{display:none;}' +
      '.bd-omni-list[data-bd-view="other"] .bd-omni-row[data-bd-lane="main"]{display:none;}' +
      '.bd-svd-cap{font:700 .6rem/1.3 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;margin:.1rem 0 .3rem;}' +
      '.bd-svd-count{font:700 .6rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#bcd0f0;background:rgba(159,180,212,.1);border:1px solid rgba(159,180,212,.22);border-radius:999px;padding:.16rem .45rem;}' +
      '.bd-eff{font:700 .6rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;border-radius:999px;padding:.16rem .45rem;white-space:nowrap;}' +
      '.bd-eff-adv{color:#93c5fd;background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.3);}' +
      '.bd-eff-opp{color:#fdba74;background:rgba(251,146,60,.14);border:1px solid rgba(251,146,60,.32);}' +
      '.bd-omni-why{font:500 .78rem/1.45 "Barlow",sans-serif;color:#9fb4d4;margin-top:.35rem;}' +
      '.bd-rc{border:1px solid rgba(159,180,212,.12);border-radius:.7rem;padding:.7rem .8rem;margin-bottom:.7rem;background:rgba(10,15,30,.4);}' +
      '.bd-rc-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem;align-items:baseline;}' +
      '.bd-rc-q{font:700 .9rem/1.25 "Barlow Condensed",sans-serif;color:#fff;}' +
      '.bd-rc-meta{font:600 .68rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#8aa0c4;}' +
      '.bd-tallies{display:flex;flex-wrap:wrap;gap:.35rem;margin:.45rem 0;}' +
      '.bd-tally{font:700 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;border-radius:.35rem;padding:.2rem .45rem;color:#cbd9ec;background:rgba(159,180,212,.1);border:1px solid rgba(159,180,212,.2);}' +
      '.bd-tally-yea{color:#9ff0bd;background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.3);}' +
      '.bd-tally-nay{color:#fca5a5;background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.3);}' +
      // ── the folded prose ──────────────────────────────────────────────────
      // A closed disclosure has to look like something a reader is CHOOSING not
      // to open, so it is a full-width bar with its own hint text rather than a
      // bare caret. Open, it is body copy at reading width and nothing else.
      '.bd-foldsec{margin-top:1rem;}' +
      '.bd-fold{border:1px solid rgba(159,180,212,.16);border-radius:.6rem;background:rgba(10,15,30,.34);}' +
      '.bd-fold-sum{display:flex;flex-wrap:wrap;align-items:center;gap:.2rem .6rem;cursor:pointer;list-style:none;padding:.6rem .75rem;}' +
      '.bd-fold-sum::-webkit-details-marker{display:none;}' +
      '.bd-fold-sum:hover{background:rgba(255,255,255,.03);}' +
      '.bd-fold-sum:focus-visible{outline:2px solid #7fb4ff;outline-offset:-2px;}' +
      '.bd-fold-t{font:700 .84rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#e6eefc;}' +
      '.bd-fold-h{font:600 .66rem/1.3 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-fold[open] .bd-fold-sum{border-bottom:1px solid rgba(159,180,212,.14);}' +
      '.bd-fold-in{padding:.7rem .75rem .85rem;}' +
      '.bd-fold-body{font:500 .88rem/1.6 "Barlow",sans-serif;color:#b9c8e0;margin:0;white-space:pre-line;}' +
      // ── the roll-call drawer ──────────────────────────────────────────────
      // Closed by default (see rollcallsSection). The summary is the door the
      // letterhead's vote strip promises, so it is styled as a control and not as
      // a caption, and it says how many names are behind it before it is opened.
      '.bd-rolldrop{margin-top:.5rem;border-top:1px solid rgba(159,180,212,.12);}' +
      '.bd-roll-sum{display:flex;flex-wrap:wrap;align-items:center;gap:.2rem .6rem;cursor:pointer;list-style:none;padding:.55rem .1rem;}' +
      '.bd-roll-sum::-webkit-details-marker{display:none;}' +
      '.bd-roll-sum:hover .bd-roll-sum-t{color:#9ec8ff;text-decoration:underline;}' +
      '.bd-roll-sum:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}' +
      '.bd-roll-sum-t{font:700 .8rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#7fb4ff;}' +
      '.bd-roll-sum-n{font:600 .64rem/1.3 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-rollbody{padding-bottom:.2rem;}' +
      '.bd-rf{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .7rem;margin:.1rem 0 .35rem;}' +
      '.bd-rf-pills{display:flex;flex-wrap:wrap;gap:.3rem;}' +
      '.bd-rf-btn{font:700 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#cbd9ec;background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.22);border-radius:999px;padding:.3rem .6rem;cursor:pointer;}' +
      '.bd-rf-btn b{color:#e6eefc;font-weight:800;}' +
      '.bd-rf-btn[aria-pressed="true"]{color:#9ff0bd;background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.35);}' +
      '.bd-rf-btn:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}' +
      '.bd-rf-find{display:inline-flex;align-items:center;gap:.35rem;}' +
      '.bd-rf-find-l{font:700 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-rf-in{font:500 .78rem/1.3 "Barlow",sans-serif;color:#e6eefc;background:rgba(10,15,30,.6);border:1px solid rgba(159,180,212,.22);border-radius:.4rem;padding:.3rem .5rem;min-width:9rem;}' +
      '.bd-rf-in:focus-visible{outline:2px solid #7fb4ff;outline-offset:1px;}' +
      '.bd-rf-none{flex-basis:100%;font:500 .74rem/1.4 "Barlow",sans-serif;color:#fdba74;margin:0;}' +
      '.bd-rf-none:empty{display:none;}' +
      // The reader's own two filters over a list of several hundred names. Both
      // leave every row in the DOM: the position pills are one attribute on the
      // list, and the name search marks the misses. Nothing on this face is
      // counted from what is on screen, so neither can change a tally.
      '.bd-votes[data-bd-roll-view="yea"] .bd-vote-row:not([data-bd-pos="yea"]){display:none;}' +
      '.bd-votes[data-bd-roll-view="nay"] .bd-vote-row:not([data-bd-pos="nay"]){display:none;}' +
      '.bd-votes[data-bd-roll-view="present"] .bd-vote-row:not([data-bd-pos="present"]){display:none;}' +
      '.bd-votes[data-bd-roll-view="not_voting"] .bd-vote-row:not([data-bd-pos="not_voting"]){display:none;}' +
      '.bd-vote-row.bd-vhide{display:none;}' +
      '.bd-votes{margin-top:.4rem;display:flex;flex-direction:column;gap:.2rem;}' +
      '.bd-vote-row{display:flex;align-items:center;gap:.5rem;padding:.28rem .1rem;border-bottom:1px solid rgba(255,255,255,.04);}' +
      '.bd-vote-sum{display:flex;align-items:center;gap:.5rem;cursor:pointer;list-style:none;padding:.28rem .1rem;}' +
      '.bd-vote-sum::-webkit-details-marker{display:none;}' +
      '.bd-vote-exp>summary:hover{background:rgba(255,255,255,.03);}' +
      '.bd-vote-name{background:none;border:0;color:#cbd9ec;font:600 .84rem/1.2 "Barlow",sans-serif;cursor:pointer;padding:0;text-align:left;}' +
      '.bd-vote-name:hover{color:#9ec8ff;text-decoration:underline;}' +
      '.bd-rel{font:700 .54rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#7dd3fc;background:rgba(125,211,252,.12);border:1px solid rgba(125,211,252,.3);border-radius:999px;padding:.12rem .38rem;}' +
      '.bd-pos{margin-left:auto;font:700 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;border-radius:.35rem;padding:.2rem .5rem;white-space:nowrap;}' +
      '.bd-pos-yea{color:#9ff0bd;background:rgba(74,222,128,.14);border:1px solid rgba(74,222,128,.32);}' +
      '.bd-pos-nay{color:#fca5a5;background:rgba(248,113,113,.14);border:1px solid rgba(248,113,113,.32);}' +
      '.bd-pos-neutral{color:#cbd9ec;background:rgba(159,180,212,.12);border:1px solid rgba(159,180,212,.28);}' +
      '.bd-svd-mini{display:inline-flex;gap:.25rem;margin-left:.2rem;}' +
      '.bd-svd-body{padding:.35rem 0 .5rem 1rem;display:flex;flex-direction:column;gap:.2rem;}' +
      '.bd-svd-row{display:flex;align-items:center;flex-wrap:wrap;gap:.4rem;}' +
      '.bd-svd-issue{font:500 .78rem/1.3 "Barlow",sans-serif;color:#b9c8e0;margin-right:auto;}' +
      '.bd-v{font:700 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;text-transform:uppercase;border-radius:999px;padding:.14rem .4rem;white-space:nowrap;}' +
      '.bd-v-consistent{color:#6ee7a0;background:rgba(74,222,128,.16);border:1px solid rgba(74,222,128,.35);}' +
      '.bd-v-contradicts{color:#fca5a5;background:rgba(248,113,113,.18);border:1px solid rgba(248,113,113,.4);}' +
      '.bd-v-mixed{color:#93c5fd;background:rgba(96,165,250,.16);border:1px solid rgba(96,165,250,.35);}' +
      '.bd-v-neutral{color:#9fb4d4;background:rgba(159,180,212,.12);border:1px solid rgba(159,180,212,.28);}' +
      '.bd-people{display:flex;flex-wrap:wrap;gap:.45rem;}' +
      '.bd-person{display:inline-flex;flex-direction:column;align-items:flex-start;gap:.05rem;cursor:pointer;text-align:left;' +
        'background:rgba(255,255,255,.04);border:1px solid rgba(159,180,212,.16);border-radius:.6rem;padding:.4rem .6rem;}' +
      '.bd-person:hover{border-color:rgba(96,165,250,.45);background:rgba(96,165,250,.08);}' +
      '.bd-person-name{font:700 .82rem/1.2 "Barlow Condensed",sans-serif;color:#e6eefc;}' +
      '.bd-person-role{font:600 .6rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-rel-group{margin-bottom:.6rem;}' +
      '.bd-rel-lab{font:700 .64rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#7d97bd;margin-bottom:.35rem;}' +
      '.bd-tl{list-style:none;margin:0;padding:0 0 0 .3rem;}' +
      '.bd-tl-item{display:flex;gap:.6rem;padding:.1rem 0 .6rem;border-left:2px solid rgba(159,180,212,.18);margin-left:.3rem;padding-left:.8rem;position:relative;}' +
      '.bd-tl-dot{position:absolute;left:-5px;top:.3rem;width:8px;height:8px;border-radius:50%;background:#7fb4ff;}' +
      '.bd-tl-body{display:flex;flex-direction:column;gap:.05rem;}' +
      '.bd-tl-date{font:700 .6rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-tl-label{font:600 .86rem/1.3 "Barlow",sans-serif;color:#e6eefc;}' +
      '.bd-tl-label a{color:#9ec8ff;text-decoration:none;}.bd-tl-label a:hover{text-decoration:underline;}' +
      '.bd-tl-sub{font:500 .72rem/1.3 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#8aa0c4;}' +
      '@media (max-width:640px){.bd-panel{width:100vw;max-height:100vh;margin:0;border-radius:0;}.bd-scroll{padding:1.1rem 1rem 2rem;}' +
        '.bd-actions{gap:.4rem;}.bd-actions .bd-btn{flex:1 1 auto;text-align:center;}' +
        '.bd-rc{padding:.6rem .6rem;}.bd-rc-head{flex-direction:column;align-items:flex-start;gap:.15rem;}' +
        '.bd-vote-row,.bd-vote-sum{flex-wrap:wrap;}.bd-pos{margin-left:auto;}' +
        '.bd-svd-mini{margin-left:0;flex-basis:100%;}.bd-title{font-size:1.35rem;}}' +
      // Phase 3: follow/share actions + provision tag.
      '.bd-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin:.7rem 0 .2rem;}' +
      '.bd-btn{cursor:pointer;font:700 .74rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;' +
        'color:#cbd9ec;background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.22);border-radius:999px;padding:.5rem .9rem;transition:background .15s,border-color .15s,color .15s;}' +
      '.bd-btn:hover{background:rgba(159,180,212,.16);color:#fff;}' +
      '.bd-follow.is-on{color:#f6d873;background:rgba(245,200,66,.14);border-color:rgba(245,200,66,.45);}' +
      '.bd-prov-tag{font:600 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;' +
        'background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.16);border-radius:999px;padding:.16rem .45rem;}' +
      // ✒️ Axis B — standing. Contested reads amber (the same warning colour the
      // profile lane uses for a contested record); settled reads teal; an unknown
      // standing reads grey so it can never be mistaken for "in force".
      '.bd-stand{display:inline-flex;align-items:center;gap:.28rem;font:700 .62rem/1 "Barlow Condensed",sans-serif;' +
        'letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:.2rem .5rem;white-space:nowrap;}' +
      '.bd-stand-clear{color:#9fdbd0;background:rgba(159,219,208,.12);border:1px solid rgba(159,219,208,.3);}' +
      '.bd-stand-contested{color:#f5c842;background:rgba(245,200,66,.13);border:1px solid rgba(245,200,66,.36);}' +
      '.bd-stand-none-chip{color:#93a4bd;background:rgba(147,164,189,.1);border:1px dashed rgba(147,164,189,.34);}' +
      '.bd-stand-log{margin-top:.55rem;border-left:2px solid rgba(159,180,212,.18);padding-left:.6rem;}' +
      '.bd-stand-entry{margin:.4rem 0;}' +
      '.bd-stand-head{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;}' +
      '.bd-stand-when{font:600 .68rem/1 "Barlow Condensed",sans-serif;color:#8aa0c4;letter-spacing:.03em;}' +
      '.bd-stand-who{font:500 .72rem/1.3 "Barlow",sans-serif;color:#9fb4d4;}' +
      '.bd-stand-src{margin-top:.3rem;}' +
      '.bd-stand-more{margin-top:.4rem;}' +
      '.bd-stand-more>summary{cursor:pointer;font:600 .68rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;' +
        'text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-stand-more[open]>summary{color:#cbd9ec;}' +
      '.bd-glance-contested{color:#f5c842;border-color:rgba(245,200,66,.36);}' +
      '@media(max-width:520px){.bd-stand{white-space:normal;text-align:left;}.bd-stand-head{gap:.3rem;}}' +

      // ══ THE PHONE ══════════════════════════════════════════════════════════
      // Last in the sheet on purpose: every rule here is an equal-specificity
      // override of something declared above, and "last one wins" is the only
      // thing making it win.
      //
      // Nothing in this block hides, folds or truncates anything. The ledger
      // still lists every mapped topic, the filter still opens on all of them,
      // and the bag panel still leads with the sentence about one instrument.
      // What changes is the size of the things a thumb has to hit and the space
      // reserved at the bottom of the sheet for the hardware.
      //
      // EVERY POINTER ON THIS FACE, AT 44px. The act face was built with a mouse
      // in mind and it showed: the filter pills were about 22px tall, the bag
      // chips 34, the close button 32, and the topic name in each ledger row —
      // the door into the dossier, the single most-tapped thing on the page —
      // was bare text with no padding at all. A door you have to aim at is a
      // door most people do not open. These are the same controls doing the same
      // things; they are just now the size of a fingertip.
      '@media (max-width:640px){' +
        // 100dvh, not 100vh: on a phone browser the visual viewport shrinks and
        // grows as the URL bar hides, and 100vh is the TALL one — so the bottom
        // of a 100vh panel sits behind the bar the moment it comes back. The
        // 100vh above stays as the fallback for anything that cannot parse dvh.
        '.bd-panel{max-height:100dvh;}' +
        // The last bag chip, the last provision, the last source link: none of
        // them should end underneath the home indicator. env() is 0 everywhere
        // that has no inset, so this is the same declaration on every device.
        '.bd-scroll{padding-bottom:calc(2rem + env(safe-area-inset-bottom,0px));}' +
        '.bd-close{width:44px;height:44px;top:.35rem;right:.4rem;}' +
        '.bd-vf-btn{min-height:44px;display:inline-flex;align-items:center;padding:.3rem .85rem;font-size:.72rem;}' +
        '.bd-rf-btn{min-height:44px;display:inline-flex;align-items:center;}' +
        '.bd-rf-in{min-height:44px;}' +
        '.bd-omni-link{min-height:44px;display:inline-flex;align-items:center;}' +
        // The letterhead's own doors: a chip and a vote strip are both taps, and a
        // 30px tap is a miss on a phone.
        '.bd-lh-chip{min-height:44px;justify-content:center;}' +
        '.bd-lh-strip{min-height:44px;}' +
        '.bd-btn{min-height:44px;display:inline-flex;align-items:center;justify-content:center;}' +
        '.bd-person{min-height:44px;justify-content:center;}' +
        '.bd-vote-row,.bd-vote-sum{min-height:44px;}' +
        '.bd-vote-name{min-height:44px;display:inline-flex;align-items:center;}' +
        '.bd-stand-more>summary{min-height:44px;display:flex;align-items:center;}' +
        // The two new doors: the prose fold and the roll-call drawer.
        '.bd-fold-sum{min-height:44px;}' +
        '.bd-roll-sum{min-height:44px;}' +
      '}';
    var st = document.createElement('style');
    st.id = 'bd-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  window.PDXBillDetail = { open: open, close: close };

  // ── Deep-link routing ───────────────────────────────────────────────────────
  // In-app state is #bill/<sitting>/<number>; the shareable, server-visible form of
  // the same address is /b/<sitting>/<number>, which share-links.js converts back
  // into this hash on arrival. Open the panel when such a hash is present on load or
  // changes, resolving the natural key to a measure id.
  function openFromHash() {
    var h = String(location.hash || '');
    var m = h.match(/^#bill\/([^/]*)\/(.+)$/);
    if (!m) return;
    var sitting = decodeURIComponent(m[1] || '');
    var number = decodeURIComponent(m[2] || '');
    // Already showing this bill (e.g. we just set the hash on open) — do nothing.
    var ov = document.getElementById('pdx-bd-overlay');
    if (ov && !ov.hidden && _current && _current.number === number &&
        String(_current.sitting || _current.congress || '') === String(sitting || '')) return;
    var bills = G('PDXBills');
    if (!bills || !bills.list) { return; }
    // The first segment is a SITTING: "119" for a congress, "2024GS" for a state
    // session. It is not sent as ?congress= any more, because a state row has no
    // congress and that filter would exclude the very bill being asked for.
    open(number, sitting);
  }
  window.addEventListener('hashchange', openFromHash);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openFromHash);
  else openFromHash();
})();
